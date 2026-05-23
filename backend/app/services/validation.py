import re
import json
from datetime import datetime
from typing import Dict, Any, Tuple, Optional
from app.core.security import redis_client

# DBD Lookup Dictionary for premium merchants
DBD_DICTIONARY = {
    "0107536000231": "บริษัท ซีพี ออลล์ จำกัด (มหาชน)",
    "0107561000242": "บริษัท ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)",
    "0105536092641": "บริษัท เอก-ชัย ดีสทริบิวชั่น ซิสเทม จำกัด",
    "0105539021206": "บริษัท เซ็นทรัล ฟู้ด รีเทล จำกัด",
    "0107535000262": "บริษัท แอดวานซ์ อินโฟร์ เซอร์วิส จำกัด (มหาชน)",
    "0107536000028": "บริษัท ทรู คอร์ปอเรชั่น จำกัด (มหาชน)",
    "0105558039396": "บริษัท ช้อปปี้ (ประเทศไทย) จำกัด",
    "0105555026412": "บริษัท ลาซาด้า จำกัด",
    "0105556111863": "บริษัท แกร็บแท็กซี่ (ประเทศไทย) จำกัด",
}

THAI_MONTHS = {
    "ม.ค.": 1, "มกราคม": 1,
    "ก.พ.": 2, "กุมภาพันธ์": 2,
    "มี.ค.": 3, "มีนาคม": 3,
    "เม.ย.": 4, "เมษายน": 4,
    "พ.ค.": 5, "พฤษภาคม": 5,
    "มิ.ย.": 6, "มิถุนายน": 6,
    "ก.ค.": 7, "กรกฎาคม": 7,
    "ส.ค.": 8, "สิงหาคม": 8,
    "ก.ย.": 9, "กันยายน": 9,
    "ต.ค.": 10, "ตุลาคม": 10,
    "พ.ย.": 11, "พฤศจิกายน": 11,
    "ธ.ค.": 12, "ธันวาคม": 12
}

def verify_thai_tax_id(tax_id: Any) -> Tuple[bool, Optional[str]]:
    """
    Verify Thai 13-digit Tax ID using Modulo-11 checksum with Redis Caching.
    Returns: (is_valid, dbd_company_name)
    """
    if not tax_id:
        return False, None
        
    cleaned = "".join(c for c in str(tax_id) if c.isdigit())
    if len(cleaned) != 13:
        return False, None
        
    # Query Redis cache first if available
    cache_key = f"dbd:{cleaned}"
    if redis_client:
        try:
            cached_val = redis_client.get(cache_key)
            if cached_val:
                res = json.loads(cached_val)
                return res.get("is_valid", False), res.get("name")
        except Exception as cache_err:
            print(f"[REDIS_VALIDATION_ERROR] Failed to query cache: {cache_err}")
        
    try:
        digits = [int(c) for c in cleaned]
        total = sum(digits[i] * (13 - i) for i in range(12))
        check_digit = (11 - (total % 11)) % 10
        
        is_valid = digits[12] == check_digit
        matched_name = None
        
        if is_valid:
            matched_name = DBD_DICTIONARY.get(cleaned)
            
        # Store result in Redis cache with 7-day TTL (604800 seconds) if available
        if redis_client:
            try:
                redis_client.setex(
                    cache_key,
                    604800,
                    json.dumps({"is_valid": is_valid, "name": matched_name})
                )
            except Exception as cache_err:
                print(f"[REDIS_VALIDATION_ERROR] Failed to write to cache: {cache_err}")
                
        return is_valid, matched_name
    except Exception:
        return False, None


def parse_thai_date(date_str: Any) -> Optional[str]:
    """
    Parse a Thai/English textual date and normalize it to YYYY-MM-DD.
    Handles Buddhist calendar conversion (-543 years).
    """
    if not date_str:
        return None
        
    date_clean = str(date_str).strip()
    
    # Try direct ISO parsing first
    try:
        parsed = datetime.strptime(date_clean, "%Y-%m-%d")
        # Ensure year is reasonable (if Buddhist year got entered as Gregorian, e.g. 2569-05-23)
        if parsed.year > 2400:
            parsed = parsed.replace(year=parsed.year - 543)
        return parsed.strftime("%Y-%m-%d")
    except ValueError:
        pass

    # Regex matching for Thai formats: DD Month YYYY or DD/MM/YYYY
    # Example: 23 พ.ค. 2569 or 23/05/2569 or 23/05/2026
    date_clean = date_clean.replace("-", "/").replace(".", ".")
    
    # Check if format is slash-based DD/MM/YYYY
    slash_match = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", date_clean)
    if slash_match:
        day = int(slash_match.group(1))
        month = int(slash_match.group(2))
        year = int(slash_match.group(3))
        if year > 2400:
            year -= 543
        try:
            return f"{year:04d}-{month:02d}-{day:02d}"
        except Exception:
            return None

    # Check for text months
    # Example: 23 พ.ค. 2569 or 23 พฤษภาคม 2026
    words = date_clean.split()
    if len(words) >= 3:
        try:
            day = int(words[0])
            month_text = words[1]
            year = int(words[2])
            
            # Find month number
            month = 1
            for k, v in THAI_MONTHS.items():
                if k in month_text:
                    month = v
                    break
            
            if year > 2400:
                year -= 543
                
            return f"{year:04d}-{month:02d}-{day:02d}"
        except Exception:
            pass

    return None

def audit_mathematical_consistency(amount: Optional[float], vat: Optional[float]) -> Tuple[bool, str]:
    """
    Checks if Amount (Total) and VAT match mathematical proportions.
    Common Thai VAT rate is 7%.
    Returns (is_consistent, reason_message)
    """
    if amount is None:
        return False, "ไม่พบยอดเงินสุทธิรวมในบิล"
        
    if amount <= 0:
        return False, "ยอดเงินสุทธิในบิลต้องมากกว่าศูนย์"

    # If no VAT is specified or it is 0, we treat it as consistent 0% VAT
    if not vat or vat <= 0:
        return True, "ใบเสร็จไม่มีภาษีมูลค่าเพิ่ม (VAT 0%)"

    # In Thailand, typically amount = subtotal + vat.
    # If subtotal is listed, subtotal = amount - vat.
    # VAT = subtotal * 0.07 => VAT = (amount - VAT) * 0.07 => VAT * 1.07 = amount * 0.07 => VAT = amount * (7/107)
    expected_vat_7 = amount * (7 / 107)
    
    # Check if VAT matches roughly 7% of subtotal (with some tolerance for rounding, e.g., 2.0 Baht)
    tolerance = 2.0
    if abs(vat - expected_vat_7) <= tolerance:
        return True, "ตรวจสอบความสอดคล้องทางตัวเลขสำเร็จ (VAT 7%)"
        
    # Check alternate calculation where subtotal was used directly: VAT = amount * 0.07
    expected_vat_direct = (amount - vat) * 0.07 if amount > vat else amount * 0.07
    if abs(vat - expected_vat_direct) <= tolerance:
        return True, "ตรวจสอบความสอดคล้องทางตัวเลขสำเร็จ (VAT 7% บนยอดฐานภาษี)"
        
    return False, f"ยอด VAT (฿{vat:.2f}) ไม่สอดคล้องกับยอดรวมสุทธิ (฿{amount:.2f})"
