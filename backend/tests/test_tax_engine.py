"""
Unit Tests — Tax Engine
รัน: pytest tests/test_tax_engine.py -v

ทุก test ต้องผ่านก่อน deploy จริง
ตรวจสอบตัวเลขกับนักบัญชีด้วย
"""
import pytest
from app.services.tax_engine.calculator import (
    calculate_tax, calculate_progressive_tax,
    calculate_deductible_expenses, TaxInput,
    FILING_THRESHOLD_SINGLE, VAT_THRESHOLD,
)

# -------------------------------------------------------
# ค่าใช้จ่าย
# -------------------------------------------------------
class TestDeductibleExpenses:
    def test_flat_rate_60_percent(self):
        """หักเหมา 60% — กรณีปกติ"""
        result = calculate_deductible_expenses(500_000, "flat_rate")
        assert result == 300_000   # 500,000 × 60%

    def test_flat_rate_capped_at_600k(self):
        """หักเหมา 60% แต่สูงสุด 600,000"""
        result = calculate_deductible_expenses(1_200_000, "flat_rate")
        assert result == 600_000   # cap ที่ 600k

    def test_actual_expense_normal(self):
        """หักจริงปกติ"""
        result = calculate_deductible_expenses(500_000, "actual", actual=200_000)
        assert result == 200_000

    def test_actual_expense_cannot_exceed_income(self):
        """ค่าใช้จ่ายต้องไม่เกินรายได้"""
        result = calculate_deductible_expenses(100_000, "actual", actual=200_000)
        assert result == 100_000

# -------------------------------------------------------
# Progressive Tax
# -------------------------------------------------------
class TestProgressiveTax:
    def test_zero_income(self):
        tax, _ = calculate_progressive_tax(0)
        assert tax == 0

    def test_within_zero_bracket(self):
        """รายได้ไม่เกิน 150k ไม่เสียภาษี"""
        tax, _ = calculate_progressive_tax(150_000)
        assert tax == 0

    def test_second_bracket(self):
        """รายได้ 300k — เสีย 5% ของ 150k"""
        tax, _ = calculate_progressive_tax(300_000)
        assert tax == 7_500   # (300k-150k) × 5%

    def test_multiple_brackets(self):
        """รายได้ 500k"""
        tax, breakdown = calculate_progressive_tax(500_000)
        assert tax == 27_500
        assert len(breakdown) == 2  # 2 brackets ที่มี rate > 0

# -------------------------------------------------------
# Full Calculation
# -------------------------------------------------------
class TestCalculateTax:
    def test_must_file_threshold(self):
        """รายได้เกิน 60k ต้องยื่น"""
        result = calculate_tax(TaxInput(annual_income=100_000))
        assert result.must_file is True

    def test_no_need_to_file(self):
        """รายได้ไม่เกิน 60k ไม่ต้องยื่น"""
        result = calculate_tax(TaxInput(annual_income=50_000))
        assert result.must_file is False

    def test_vat_not_required_below_threshold(self):
        """รายได้ต่ำกว่า 1.8M ไม่ต้องจด VAT"""
        result = calculate_tax(TaxInput(annual_income=1_000_000))
        assert result.must_register_vat is False

    def test_vat_required_above_threshold(self):
        """รายได้เกิน 1.8M ต้องจด VAT"""
        result = calculate_tax(TaxInput(annual_income=2_000_000))
        assert result.must_register_vat is True

    def test_shopee_seller_500k(self):
        """แม่ค้า Shopee รายได้ 500k/ปี — ตรวจสอบกับนักบัญชี"""
        result = calculate_tax(TaxInput(
            annual_income=500_000,
            expense_method="flat_rate",
        ))
        # รายได้ 500k - ค่าใช้จ่าย 300k - ลดหย่อนส่วนตัว 60k = เงินได้สุทธิ 140k
        assert result.taxable_income == 140_000
        # ไม่เกิน 150k → ภาษี 0
        assert result.tax_amount == 0
        assert result.must_file is True        # ยังต้องยื่น แม้ภาษีเป็น 0

    def test_disclaimer_always_present(self):
        """ต้องมี disclaimer เสมอ"""
        result = calculate_tax(TaxInput(annual_income=1_000_000))
        assert len(result.disclaimer) > 0
