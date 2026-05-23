from pydantic import Field
import datetime
from typing import Optional
from uuid import UUID
from app.core.security import SafeBaseModel

class TransactionBase(SafeBaseModel):
    date: datetime.date = Field(..., description="วันที่เกิดรายการ (YYYY-MM-DD)")
    name: str = Field(..., description="ชื่อรายการ หรือคำอธิบายคร่าวๆ")
    amount: float = Field(..., gt=0, description="จำนวนเงิน (บาท)")
    type: str = Field(..., description="ประเภทรายการ: income | expense")
    category: str = Field(..., description="หมวดหมู่ของรายการ เช่น ค่าแรงพนักงาน, เงินเดือน")
    is_tax_deductible: bool = Field(False, description="สามารถหักลดหย่อนภาษีได้หรือไม่ (กรณีรายจ่าย)")
    channel: Optional[str] = Field(None, description="ช่องทางการขาย: shopee | lazada | tiktok | facebook | other")
    note: Optional[str] = Field(None, description="หมายเหตุเพิ่มเติม")

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(SafeBaseModel):
    date: Optional[datetime.date] = None
    name: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[str] = None
    category: Optional[str] = None
    is_tax_deductible: Optional[bool] = None
    channel: Optional[str] = None
    note: Optional[str] = None

class TransactionInDB(TransactionBase):
    id: UUID
    user_id: UUID
    created_at: datetime.datetime

    class Config:
        from_attributes = True
