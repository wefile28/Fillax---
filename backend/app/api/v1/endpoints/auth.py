from fastapi import APIRouter, Depends, HTTPException, status
from app.db.supabase import supabase, get_current_user
from app.schemas.auth import ProfileUpdate, ProfileInDB
from typing import Any

router = APIRouter()

@router.get("/me", response_model=ProfileInDB)
def get_me(current_user: Any = Depends(get_current_user)):
    """
    Get the authenticated user's profile.
    If the profile is not yet in the profiles table, retrieve what we can
    from metadata and insert a default profile record.
    """
    try:
        # Query the user profile from profiles table in Supabase
        res = supabase.table("profiles").select("*").eq("id", current_user.id).execute()
        
        if res.data and len(res.data) > 0:
            return res.data[0]
            
        # Fallback: if user is not in profiles table, create a default profile
        # using the Auth metadata.
        meta = getattr(current_user, 'user_metadata', {}) or {}
        email = current_user.email
        full_name = meta.get("full_name", email.split("@")[0])
        avatar_url = meta.get("avatar_url", "")
        
        profile_data = {
            "id": current_user.id,
            "email": email,
            "full_name": full_name,
            "avatar_url": avatar_url,
            "seller_type": "individual",
            "plan": "free"
        }
        
        insert_res = supabase.table("profiles").insert(profile_data).execute()
        if not insert_res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initialize user profile"
            )
        return insert_res.data[0]
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}"
        )

@router.put("/profile", response_model=ProfileInDB)
def update_profile(
    profile_update: ProfileUpdate, 
    current_user: Any = Depends(get_current_user)
):
    """
    Update user profile information (such as full name, shop name, channels, and seller type).
    """
    try:
        # filter out None values to keep old values
        update_data = {k: v for k, v in profile_update.dict().items() if v is not None}
        
        res = supabase.table("profiles").update(update_data).eq("id", current_user.id).execute()
        
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found or update failed."
            )
            
        return res.data[0]
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update failed: {str(e)}"
        )

@router.get("/dbd/lookup")
def dbd_lookup(tax_id: str, current_user: Any = Depends(get_current_user)):
    """
    Simulates DBD (Department of Business Development) Lookup for a Thai Tax ID.
    Enriches business registration details automatically.
    """
    from app.services.validation import verify_thai_tax_id
    
    is_valid, name = verify_thai_tax_id(tax_id)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="เลขประจำตัวผู้เสียภาษีไม่ถูกต้องตามหลักการคำนวณ Modulo-11"
        )
        
    if not name:
        # Generate a realistic mock company name based on the last few digits
        suffix = int(tax_id[-4:]) % 5
        prefixes = [
            "บริษัท ทริปเปิลเอส เทรดดิ้ง จำกัด",
            "บริษัท พลังงานไทยพัฒนา จำกัด",
            "บริษัท สยามคอมเมิร์ซแอนด์โลจิสติกส์ จำกัด",
            "บริษัท ไอทีที โซลูชั่น แอนด์ เซอร์วิสเซส จำกัด",
            "บริษัท โกลบอลเทรดไทย จำกัด"
        ]
        name = prefixes[suffix]
        
    mock_address = f"เลขที่ {tax_id[3:6]}/{tax_id[6:8]} ชั้น 18 อาคารบิสซิเนสทาวเวอร์ ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110"
    
    return {
        "success": True,
        "tax_id": tax_id,
        "company_name": name,
        "address": mock_address,
        "branch_code": "00000",
        "is_vat_registered": int(tax_id[-1]) % 2 == 0
    }

