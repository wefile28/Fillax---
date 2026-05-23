from pydantic import EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.core.security import SafeBaseModel

class ProfileBase(SafeBaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    shop_name: Optional[str] = None
    shop_channels: List[str] = []
    seller_type: str = "individual"

class ProfileUpdate(ProfileBase):
    pass

class ProfileInDB(ProfileBase):
    id: UUID
    email: EmailStr
    plan: str
    plan_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
