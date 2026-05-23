from pydantic import Field
from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from app.core.security import SafeBaseModel

class DeductionBase(SafeBaseModel):
    tax_year: int = Field(..., description="ปีภาษี เช่น 2026")
    deduction_id: str = Field(..., description="รหัสการลดหย่อน เช่น insurance_life, ssf, rmf")
    amount: float = Field(0.0, ge=0, description="จำนวนเงินที่ลดหย่อน")
    is_applicable: bool = Field(False, description="เปิดใช้งานการลดหย่อนนี้หรือไม่")

class DeductionCreate(DeductionBase):
    pass

class DeductionUpdate(SafeBaseModel):
    amount: Optional[float] = Field(None, ge=0)
    is_applicable: Optional[bool] = None

class DeductionInDB(DeductionBase):
    id: UUID
    user_id: UUID
    updated_at: datetime

    class Config:
        from_attributes = True

class TaxCheckSave(SafeBaseModel):
    tax_year: int
    annual_income: float
    status: str  # 'must_file' | 'no_need' | 'uncertain'
    result_json: dict  # Full tax calculation JSON structure

class TaxCheckInDB(TaxCheckSave):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
