import pytest
from app.services.validation import verify_thai_tax_id, parse_thai_date, audit_mathematical_consistency

def test_verify_thai_tax_id():
    # PTT Oil and Retail Business Public Company Limited - Mathematically Valid Tax ID
    valid_tax_id = "0107561000242"
    is_valid, dbd_name = verify_thai_tax_id(valid_tax_id)
    assert is_valid is True
    assert dbd_name == "บริษัท ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)"

    # Invalid Checksum Tax ID
    invalid_tax_id = "0107536000239"
    is_valid, dbd_name = verify_thai_tax_id(invalid_tax_id)
    assert is_valid is False
    assert dbd_name is None

    # Empty and None values
    assert verify_thai_tax_id(None) == (False, None)
    assert verify_thai_tax_id("") == (False, None)

def test_parse_thai_date():
    # Buddhist calendar year conversion to Gregorian (2569 -> 2026)
    buddhist_date = "23 พ.ค. 2569"
    normalized = parse_thai_date(buddhist_date)
    assert normalized == "2026-05-23"

    # Slash-based Buddhist format
    buddhist_slash = "23/05/2569"
    normalized = parse_thai_date(buddhist_slash)
    assert normalized == "2026-05-23"

    # Standard ISO format (no conversion needed)
    iso_date = "2026-05-23"
    normalized = parse_thai_date(iso_date)
    assert normalized == "2026-05-23"

    # Invalid date strings
    assert parse_thai_date(None) is None
    assert parse_thai_date("random-string") is None

def test_audit_mathematical_consistency():
    # Math consistent 7% VAT (Total = 107.0, Subtotal = 100.0, VAT = 7.0)
    # Expected VAT = 107 * (7/107) = 7.0
    is_ok, reason = audit_mathematical_consistency(107.00, 7.00)
    assert is_ok is True
    assert "ตรวจสอบความสอดคล้องทางตัวเลขสำเร็จ" in reason

    # Math consistent 0% VAT
    is_ok, reason = audit_mathematical_consistency(100.00, 0.0)
    assert is_ok is True
    assert "ไม่มีภาษีมูลค่าเพิ่ม" in reason

    # Math inconsistent 7% VAT (Total = 107.0, VAT = 20.0)
    is_ok, reason = audit_mathematical_consistency(107.00, 20.00)
    assert is_ok is False
    assert "ไม่สอดคล้อง" in reason
