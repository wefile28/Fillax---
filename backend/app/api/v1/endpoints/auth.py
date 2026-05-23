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
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update failed: {str(e)}"
        )
