from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel, Field
from app.services.tax_engine.calculator import calculate_tax, TaxInput
from app.db.supabase import supabase, get_current_user
from app.schemas.tax import DeductionCreate, DeductionUpdate, DeductionInDB, TaxCheckInDB
from app.core.security import tax_limiter, SafeBaseModel
from typing import Any, List, Optional
from uuid import UUID

router = APIRouter()

# -------------------------------------------------------
# Request / Response schemas
# -------------------------------------------------------
class TaxCheckRequest(SafeBaseModel):
    annual_income: float = Field(..., gt=0, description="รายได้รวมทั้งปี (บาท)")
    expense_method: str = Field("flat_rate", description="flat_rate | actual")
    actual_expenses: float = Field(0, ge=0)
    personal_allowances: float = Field(0, ge=0, description="ลดหย่อนเพิ่มเติม")
    seller_type: str = Field("individual", description="individual | company")
    tax_year: int = Field(2026, description="ปีภาษี")

class TaxStatusRequest(SafeBaseModel):
    """สำหรับ Free Tier — ถามแค่สถานะ ไม่คำนวณตัวเลขภาษี"""
    annual_income: float
    seller_type: str = "individual"
    ever_filed: bool = False
    tax_year: int = Field(2026, description="ปีภาษี")

# -------------------------------------------------------
# Endpoints
# -------------------------------------------------------
@router.post("/check-status")
async def check_tax_status(
    request: Request,
    req: TaxStatusRequest,
    current_user: Any = Depends(get_current_user)
):
    """
    Free tier — บอกสถานะว่าต้องยื่นไหม
    ไม่คำนวณตัวเลขภาษีที่แน่นอน
    บันทึกประวัติการเช็คลง Database ด้วย
    """
    # Apply secure rate limiter
    await tax_limiter.check(request, "tax_assessment")
    from app.services.tax_engine.calculator import FILING_THRESHOLD_SINGLE, VAT_THRESHOLD

    must_file = req.annual_income > FILING_THRESHOLD_SINGLE
    status_str = (
        "must_file" if must_file
        else "uncertain" if req.annual_income > 30_000
        else "no_need"
    )

    result_payload = {
        "status": status_str,
        "annual_income": req.annual_income,
        "must_file": must_file,
        "must_register_vat": req.annual_income >= VAT_THRESHOLD,
        "vat_threshold_remaining": max(0.0, VAT_THRESHOLD - req.annual_income),
        "recommended_filing": "pnd90" if must_file else None,
        "deadline": "31 มีนาคม ของปีถัดไป" if must_file else None,
        "rdth_link": "https://efiling.rd.go.th",
        "disclaimer": (
            "ผลนี้เป็นการประเมินเบื้องต้นเพื่อให้ข้อมูลเท่านั้น "
            "ไม่ใช่คำปรึกษาทางกฎหมาย ควรปรึกษานักบัญชีหรือสรรพากรโดยตรง"
        ),
    }

    # Save to tax_checks history
    try:
        supabase.table("tax_checks").insert({
            "user_id": current_user.id,
            "tax_year": req.tax_year,
            "annual_income": req.annual_income,
            "status": status_str,
            "result_json": result_payload
        }).execute()
    except Exception as e:
        # Don't fail the response if database logging fails, just log it
        print(f"Warning: Failed to log tax check history: {e}")

    return result_payload

@router.post("/calculate")
async def calculate(
    request: Request,
    req: TaxCheckRequest,
    current_user: Any = Depends(get_current_user)
):
    """
    Pro tier — คำนวณภาษีแบบละเอียด และเก็บประวัติ
    """
    # Apply secure rate limiter
    await tax_limiter.check(request, "tax_assessment")
    # 1. Check user tier from profile
    try:
        prof_res = supabase.table("profiles").select("plan").eq("id", current_user.id).execute()
        user_plan = "free"
        if prof_res.data and len(prof_res.data) > 0:
            user_plan = prof_res.data[0].get("plan", "free")
            
        if user_plan not in ["pro", "agency"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Pro plan required"
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Warning: could not fetch profile plan: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not verify subscription status. Pro plan required."
        )

    try:
        result = calculate_tax(TaxInput(
            annual_income=req.annual_income,
            expense_method=req.expense_method,
            actual_expenses=req.actual_expenses,
            personal_allowances=req.personal_allowances,
            seller_type=req.seller_type,
        ))
        
        result_payload = {
            "gross_income": result.gross_income,
            "deductible_expenses": result.deductible_expenses,
            "taxable_income": result.taxable_income,
            "tax_amount": result.tax_amount,
            "effective_rate": result.effective_rate,
            "must_file": result.must_file,
            "must_register_vat": result.must_register_vat,
            "vat_threshold_remaining": result.vat_threshold_remaining,
            "breakdown": result.breakdown,
            "disclaimer": result.disclaimer,
        }

        # Save to database checks history
        status_str = "must_file" if result.must_file else "no_need"
        supabase.table("tax_checks").insert({
            "user_id": current_user.id,
            "tax_year": req.tax_year,
            "annual_income": req.annual_income,
            "status": status_str,
            "result_json": result_payload
        }).execute()

        return result_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------
# Allowances & Deductions
# -------------------------------------------------------
@router.get("/allowances", response_model=List[DeductionInDB])
def get_user_deductions(
    year: int = Query(2026),
    current_user: Any = Depends(get_current_user)
):
    """
    Get all active deductions for the authenticated user for a specific tax year.
    """
    try:
        res = supabase.table("user_deductions").select("*").eq("user_id", current_user.id).eq("tax_year", year).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user deductions: {str(e)}"
        )

@router.put("/allowances", response_model=DeductionInDB)
def update_user_deduction(
    deduction: DeductionCreate,
    current_user: Any = Depends(get_current_user)
):
    """
    Upsert a user tax deduction / allowance (e.g. Life insurance, SSF, RMF).
    """
    try:
        # Perform upsert on unique constraint (user_id, tax_year, deduction_id)
        deduction_data = deduction.dict()
        deduction_data["user_id"] = current_user.id
        
        # Check if record exists
        existing = supabase.table("user_deductions")\
            .select("id")\
            .eq("user_id", current_user.id)\
            .eq("tax_year", deduction.tax_year)\
            .eq("deduction_id", deduction.deduction_id)\
            .execute()
            
        if existing.data and len(existing.data) > 0:
            # Update existing
            record_id = existing.data[0]["id"]
            res = supabase.table("user_deductions").update({
                "amount": deduction.amount,
                "is_applicable": deduction.is_applicable
            }).eq("id", record_id).execute()
        else:
            # Insert new
            res = supabase.table("user_deductions").insert(deduction_data).execute()
            
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to save deduction allowance."
            )
            
        return res.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save deduction: {str(e)}"
        )

@router.get("/history", response_model=List[TaxCheckInDB])
def get_tax_history(current_user: Any = Depends(get_current_user)):
    """
    Get tax assessment check history for the current user.
    """
    try:
        res = supabase.table("tax_checks").select("*").eq("user_id", current_user.id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tax check history: {str(e)}"
        )
