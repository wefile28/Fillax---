"""
Tax Engine — Pure Functions เท่านั้น
ไม่มี side effect ไม่มี DB call ทดสอบได้ง่าย

⚠️  ตรวจสอบโดยนักบัญชีก่อน deploy จริง
    แหล่งข้อมูล: กรมสรรพากร rd.go.th (อัปเดต 2567)
"""

from dataclasses import dataclass

# -------------------------------------------------------
# Constants — ปรับปีภาษีได้จาก DB ในอนาคต
# -------------------------------------------------------
PERSONAL_ALLOWANCE = 60_000          # ลดหย่อนส่วนตัว
MAX_FLAT_RATE_EXPENSE = 600_000      # หักค่าใช้จ่ายแบบเหมา 60% สูงสุด
VAT_THRESHOLD = 1_800_000            # เกณฑ์จด VAT
FILING_THRESHOLD_SINGLE = 60_000     # รายได้ขั้นต่ำที่ต้องยื่น (โสด)

# Progressive Tax Brackets ปี 2567
TAX_BRACKETS = [
    (0,          150_000,   0.00),
    (150_001,    300_000,   0.05),
    (300_001,    500_000,   0.10),
    (500_001,    750_000,   0.15),
    (750_001,    1_000_000, 0.20),
    (1_000_001,  2_000_000, 0.25),
    (2_000_001,  5_000_000, 0.30),
    (5_000_001,  float('inf'), 0.35),
]

# -------------------------------------------------------
# Data classes
# -------------------------------------------------------
@dataclass
class TaxInput:
    annual_income: float
    expense_method: str = "flat_rate"    # "flat_rate" | "actual"
    actual_expenses: float = 0.0
    personal_allowances: float = 0.0     # ลดหย่อนเพิ่มเติม (ประกัน, SSF, ฯลฯ)
    seller_type: str = "individual"      # "individual" | "company"

@dataclass
class TaxResult:
    gross_income: float
    deductible_expenses: float
    net_income_before_allowances: float
    total_allowances: float
    taxable_income: float
    tax_amount: float
    effective_rate: float               # % จริงที่จ่าย
    must_file: bool
    must_register_vat: bool
    vat_threshold_remaining: float
    breakdown: list[dict]               # แสดง step-by-step
    disclaimer: str

# -------------------------------------------------------
# Core functions
# -------------------------------------------------------
def calculate_deductible_expenses(income: float, method: str, actual: float = 0) -> float:
    """หักค่าใช้จ่าย — เหมา 60% หรือตามจริง"""
    if method == "flat_rate":
        return min(income * 0.60, MAX_FLAT_RATE_EXPENSE)
    return min(actual, income)          # หักได้ไม่เกินรายได้

def calculate_progressive_tax(taxable_income: float) -> tuple[float, list[dict]]:
    """คำนวณภาษีแบบอัตราก้าวหน้า — return (tax, breakdown)"""
    if taxable_income <= 0:
        return 0.0, []

    tax = 0.0
    breakdown = []
    for (min_b, max_b, rate) in TAX_BRACKETS:
        if taxable_income <= min_b - 1:
            break
        income_in_bracket = min(taxable_income, max_b) - (min_b - 1)
        tax_in_bracket = income_in_bracket * rate
        tax += tax_in_bracket
        if rate > 0:
            breakdown.append({
                "bracket": f"฿{min_b:,} – {'ไม่จำกัด' if max_b == float('inf') else f'฿{max_b:,}'}",
                "rate": f"{int(rate * 100)}%",
                "income_in_bracket": round(income_in_bracket),
                "tax": round(tax_in_bracket),
            })

    return round(tax), breakdown

def calculate_tax(inp: TaxInput) -> TaxResult:
    """
    Main function — คำนวณภาษีบุคคลธรรมดาครบวงจร
    ใช้สำหรับ Pro Plan เท่านั้น (Free = ดูสถานะ ไม่คำนวณ)
    """
    # 1. หักค่าใช้จ่าย
    expenses = calculate_deductible_expenses(
        inp.annual_income, inp.expense_method, inp.actual_expenses
    )
    net_before = inp.annual_income - expenses

    # 2. ลดหย่อนส่วนตัว + ลดหย่อนเพิ่มเติม
    total_allowances = PERSONAL_ALLOWANCE + inp.personal_allowances
    taxable = max(0, net_before - total_allowances)

    # 3. คำนวณภาษี
    tax, breakdown = calculate_progressive_tax(taxable)
    effective_rate = (tax / inp.annual_income * 100) if inp.annual_income > 0 else 0

    return TaxResult(
        gross_income=inp.annual_income,
        deductible_expenses=expenses,
        net_income_before_allowances=net_before,
        total_allowances=total_allowances,
        taxable_income=taxable,
        tax_amount=tax,
        effective_rate=round(effective_rate, 2),
        must_file=inp.annual_income > FILING_THRESHOLD_SINGLE,
        must_register_vat=inp.annual_income >= VAT_THRESHOLD,
        vat_threshold_remaining=max(0, VAT_THRESHOLD - inp.annual_income),
        breakdown=breakdown,
        disclaimer=(
            "ผลนี้เป็นการประมาณการเบื้องต้นเพื่อให้ข้อมูลเท่านั้น "
            "ไม่ใช่คำปรึกษาทางกฎหมายหรือภาษีอากร "
            "ควรปรึกษานักบัญชีหรือกรมสรรพากรโดยตรง"
        ),
    )
