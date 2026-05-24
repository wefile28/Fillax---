from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.db.supabase import supabase, get_current_user
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionInDB
from typing import Any, List, Optional
from uuid import UUID
from datetime import date

router = APIRouter()

@router.get("/transactions", response_model=List[TransactionInDB])
def get_transactions(
    type: Optional[str] = Query(None, description="income | expense"),
    channel: Optional[str] = Query(None, description="shopee | lazada | tiktok | facebook | other"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: Any = Depends(get_current_user)
):
    """
    List all transactions for the authenticated user, with optional filters.
    """
    try:
        query = supabase.table("transactions").select("*").eq("user_id", current_user.id)
        
        if type:
            query = query.eq("type", type)
        if channel:
            query = query.eq("channel", channel)
        if start_date:
            query = query.gte("date", start_date.isoformat())
        if end_date:
            query = query.lte("date", end_date.isoformat())
            
        # Order by date descending
        query = query.order("date", desc=True)
        res = query.execute()
        return res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transactions: {str(e)}"
        )

@router.post("/transactions", response_model=TransactionInDB, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_in: TransactionCreate,
    current_user: Any = Depends(get_current_user)
):
    """
    Record a new transaction (income or expense).
    """
    try:
        transaction_data = transaction_in.dict()
        transaction_data["user_id"] = current_user.id
        # Convert date to string for Supabase standard date
        transaction_data["date"] = transaction_data["date"].isoformat()
        
        res = supabase.table("transactions").insert(transaction_data).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to record transaction."
            )
        return res.data[0]
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create transaction: {str(e)}"
        )

@router.put("/transactions/{id}", response_model=TransactionInDB)
def update_transaction(
    id: UUID,
    transaction_update: TransactionUpdate,
    current_user: Any = Depends(get_current_user)
):
    """
    Update details of an existing transaction.
    """
    try:
        update_data = {k: v for k, v in transaction_update.dict().items() if v is not None}
        if "date" in update_data and update_data["date"]:
            update_data["date"] = update_data["date"].isoformat()
            
        res = supabase.table("transactions").update(update_data).eq("id", id).eq("user_id", current_user.id).execute()
        
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found or unauthorized."
            )
        return res.data[0]
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update transaction: {str(e)}"
        )

@router.delete("/transactions/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    id: UUID,
    current_user: Any = Depends(get_current_user)
):
    """
    Delete a specific transaction.
    """
    try:
        res = supabase.table("transactions").delete().eq("id", id).eq("user_id", current_user.id).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found or unauthorized."
            )
        return None
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete transaction: {str(e)}"
        )

@router.get("/summary")
def get_financial_summary(
    year: Optional[int] = Query(None),
    current_user: Any = Depends(get_current_user)
):
    """
    Get financial summary analytics (Total Income, Total Expenses, Net Income, Channel Breakdowns, and Category Breakdown).
    This serves as the dashboard's analytics center.
    """
    if year is None:
        from datetime import datetime
        year = datetime.now().year
    try:
        # Query all transactions for this user for the specified year
        res = supabase.table("transactions").select("*").eq("user_id", current_user.id).gte("date", f"{year}-01-01").lte("date", f"{year}-12-31").execute()
        
        transactions = res.data or []
        
        total_income = 0.0
        total_expense = 0.0
        
        channel_income = {}
        category_breakdown = {}
        
        for t in transactions:
            amount = float(t["amount"])
            ttype = t["type"]
            cat = t["category"]
            chan = t.get("channel") or "other"
            
            if ttype == "income":
                total_income += amount
                channel_income[chan] = channel_income.get(chan, 0.0) + amount
            else:
                total_expense += amount
                
            category_breakdown[cat] = category_breakdown.get(cat, 0.0) + amount
            
        net_income = total_income - total_expense
        
        return {
            "year": year,
            "total_income": total_income,
            "total_expenses": total_expense,
            "net_income": net_income,
            "vat_threshold": 1800000.0,
            "vat_progress_percentage": round(min((total_income / 1800000.0) * 100, 100.0), 2),
            "vat_threshold_remaining": max(0.0, 1800000.0 - total_income),
            "channels_income": [
                {"channel": k, "amount": v} for k, v in channel_income.items()
            ],
            "categories": [
                {"category": k, "amount": v} for k, v in category_breakdown.items()
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate financial summary: {str(e)}"
        )
