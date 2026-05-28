from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.db.supabase import get_current_user
from typing import List, Optional

router = APIRouter()

class TaxCalculateRequest(BaseModel):
    income: float
    expenses: float
    seller_type: str = "individual" # "individual" or "juristic"
    
    # Allowances (Personal Tax specific)
    personal_allowance: float = 60000.0  # Default standard individual allowance
    social_security: float = 0.0
    life_insurance: float = 0.0
    ssf_rmf: float = 0.0
    home_interest: float = 0.0
    easy_ereceipt: float = 0.0
    other_allowances: float = 0.0

class ProgressiveStep(BaseModel):
    bracket_range: str
    rate: float
    taxable_amount: float
    tax_amount: float

class TaxCalculateResponse(BaseModel):
    gross_income: float
    total_expenses: float
    total_allowances: float
    taxable_income: float
    tax_liability: float
    seller_type: str
    steps: List[ProgressiveStep]
    risk_level: str # "low", "medium", "high"
    risk_advice: str

def calculate_personal_tax(taxable_income: float) -> tuple[float, List[ProgressiveStep]]:
    if taxable_income <= 0:
        return 0.0, [ProgressiveStep(bracket_range="0 - 150,000", rate=0.0, taxable_amount=0.0, tax_amount=0.0)]

    steps = []
    total_tax = 0.0

    # Thai PIT Progressive brackets
    brackets = [
        (150000, 0.0, "0 - 150,000 (ยกเว้น)"),
        (150000, 0.05, "150,001 - 300,000"),
        (200000, 0.10, "300,001 - 500,000"),
        (250000, 0.15, "500,001 - 750,000"),
        (250000, 0.20, "750,001 - 1,000,000"),
        (1000000, 0.25, "1,000,001 - 2,000,000"),
        (3000000, 0.30, "2,000,001 - 5,000,000"),
        (float('inf'), 0.35, "มากกว่า 5,000,000")
    ]

    remaining = taxable_income

    # Step 1: 0 - 150,000 (0% rate)
    first_bracket = min(remaining, 150000)
    steps.append(ProgressiveStep(
        bracket_range=brackets[0][2],
        rate=0.0,
        taxable_amount=first_bracket,
        tax_amount=0.0
    ))
    remaining -= first_bracket

    for limit, rate, label in brackets[1:]:
        if remaining <= 0:
            break
        taxable_in_bracket = min(remaining, limit) if limit != float('inf') else remaining
        tax_in_bracket = taxable_in_bracket * rate
        total_tax += tax_in_bracket
        steps.append(ProgressiveStep(
            bracket_range=label,
            rate=rate * 100,
            taxable_amount=taxable_in_bracket,
            tax_amount=tax_in_bracket
        ))
        remaining -= taxable_in_bracket

    return total_tax, steps

def calculate_juristic_tax(net_profit: float) -> tuple[float, List[ProgressiveStep]]:
    """
    Computes Corporate Income Tax (CIT) for Thai SMEs:
    - Profit 0 - 300,000 Baht: 0%
    - Profit 300,001 - 3,000,000 Baht: 15%
    - Profit Over 3,000,000 Baht: 20%
    """
    if net_profit <= 0:
        return 0.0, [ProgressiveStep(bracket_range="0 - 300,000", rate=0.0, taxable_amount=0.0, tax_amount=0.0)]

    steps = []
    total_tax = 0.0

    # SME Brackets
    # 1. 0 - 300k (0%)
    bracket_1 = min(net_profit, 300000)
    steps.append(ProgressiveStep(
        bracket_range="0 - 300,000 (ยกเว้น)",
        rate=0.0,
        taxable_amount=bracket_1,
        tax_amount=0.0
    ))
    
    # 2. 300k - 3M (15%)
    remaining = net_profit - bracket_1
    if remaining > 0:
        bracket_2 = min(remaining, 2700000)
        tax_2 = bracket_2 * 0.15
        total_tax += tax_2
        steps.append(ProgressiveStep(
            bracket_range="300,001 - 3,000,000",
            rate=15.0,
            taxable_amount=bracket_2,
            tax_amount=tax_2
        ))
        remaining -= bracket_2

    # 3. Over 3M (20%)
    if remaining > 0:
        tax_3 = remaining * 0.20
        total_tax += tax_3
        steps.append(ProgressiveStep(
            bracket_range="มากกว่า 3,000,000",
            rate=20.0,
            taxable_amount=remaining,
            tax_amount=tax_3
        ))

    return total_tax, steps

@router.post("/calculate", response_model=TaxCalculateResponse)
def calculate_tax(
    payload: TaxCalculateRequest,
    current_user: any = Depends(get_current_user)
):
    """
    Active Progressive Personal/Juristic tax calculation workspace.
    Computes progressive brackets, allowance offsets, and issues VAT warning alerts.
    """
    gross_income = max(payload.income, 0.0)
    total_expenses = max(payload.expenses, 0.0)
    
    # Enforce standard VAT warning threshold of 1.8M Baht per year
    vat_threshold = 1800000.0
    is_vat_risk = gross_income >= vat_threshold
    
    if payload.seller_type == "juristic":
        total_allowances = 0.0
        taxable_income = max(gross_income - total_expenses, 0.0)
        tax_liability, steps = calculate_juristic_tax(taxable_income)
        
        # Determine corporate advices
        if is_vat_risk:
            risk_level = "high"
            risk_advice = (
                "⚠️ ยอดขายสะสมต่อปีเกิน 1.8 ล้านบาทแล้ว! ท่านมีหน้าที่ต้องจดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%) "
                "ภายใน 30 วันนับแต่วันที่ยอดขายเกินเกณฑ์ และยื่นแบบ ภ.พ.30 ทุกเดือนเพื่อป้องกันเบี้ยปรับย้อนหลังสูงสุด 2 เท่าค่ะ"
            )
        else:
            risk_level = "low"
            risk_advice = "🟢 ยอดรายรับอยู่ในเกณฑ์ปลอดภัยจากข้อผูกมัด VAT แต่อย่าลืมบันทึกทำบัญชีและยื่นงบการเงินและ ภ.พ.ด.50/51 ประจำปีนะคะ"
            
    else:
        # PIT Allowance summation
        total_allowances = (
            max(payload.personal_allowance, 0.0) +
            max(payload.social_security, 0.0) +
            max(payload.life_insurance, 0.0) +
            max(payload.ssf_rmf, 0.0) +
            max(payload.home_interest, 0.0) +
            max(payload.easy_ereceipt, 0.0) +
            max(payload.other_allowances, 0.0)
        )
        
        taxable_income = max(gross_income - total_expenses - total_allowances, 0.0)
        tax_liability, steps = calculate_personal_tax(taxable_income)
        
        # Formulate Personal Income Tax advice
        if is_vat_risk:
            risk_level = "high"
            risk_advice = (
                "⚠️ ยอดขายบุคคลธรรมดาเกิน 1.8 ล้านบาทต่อปี! สรรพากรบังคับจดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%) ทันที "
                "และหากท่านมีกำไรสุทธิทางภาษีค่อนข้างสูง แนะนำให้วางแผนจดทะเบียนจัดตั้งบริษัท/ห้างหุ้นส่วนจำกัด "
                "เพื่อลดอัตราภาษีจากขั้นบันไดบุคคลธรรมดา (สูงสุด 35%) มาใช้อัตราภาษีนิติบุคคล SME (สูงสุดเพียง 20%) ค่ะ"
            )
        elif taxable_income > 1000000:
            risk_level = "medium"
            risk_advice = (
                "💡 เงินได้สุทธิหลังหักรายจ่ายของท่านเข้าเกณฑ์เสียภาษีอัตราก้าวหน้าสูง (25% ขึ้นไป) "
                "แนะนำให้จดทะเบียนเป็นนิติบุคคลและจัดระเบียบบันทึกบิลค่าใช้จ่ายธุรกิจแบบตามจริง เพื่อเสียภาษีในเรท SME 15% จะประหยัดกว่าค่ะ"
            )
        else:
            risk_level = "low"
            risk_advice = "🟢 อัตราภาษีอยู่ในเกณฑ์ที่บริหารจัดการได้ดี แนะนำให้ใช้สิทธิ์ลดหย่อนช้อปดีมีคืน ประกันสังคม และกองทุนสะสมต่างๆ ให้เต็มโควตาค่ะ"

    return TaxCalculateResponse(
        gross_income=gross_income,
        total_expenses=total_expenses,
        total_allowances=total_allowances,
        taxable_income=taxable_income,
        tax_liability=tax_liability,
        seller_type=payload.seller_type,
        steps=steps,
        risk_level=risk_level,
        risk_advice=risk_advice
    )
