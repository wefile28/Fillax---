from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.db.supabase import supabase, get_current_user
from app.core.config import settings
from app.core.security import sanitize_text
from datetime import datetime, timezone
import google.generativeai as genai
from PIL import Image
import io
import uuid
import hashlib
import json
import httpx

router = APIRouter()

# Configure Gemini AI
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

CATEGORIES = [
    "ต้นทุนสินค้า/วัตถุดิบ",
    "ค่าแรงพนักงาน",
    "ค่าเช่าสำนักงาน/หน้าร้าน",
    "ค่าสาธารณูปโภค (น้ำ, ไฟ, เน็ต)",
    "ค่าโฆษณาและส่งเสริมการขาย",
    "ค่าขนส่งและเดินทางธุรกิจ",
    "วัสดุสิ้นเปลือง/เครื่องเขียน",
    "ค่าซอฟต์แวร์/บริการดิจิทัล",
    "ค่าธรรมเนียมธนาคาร/แพลตฟอร์ม",
    "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ"
]

@router.post("/scan")
async def scan_web_receipt(
    file: UploadFile = File(...),
    current_user: any = Depends(get_current_user)
):
    """
    Web-based AI OCR Receipt scanner endpoint.
    - Resolves Supabase bearer session context
    - Enforces 10-scans monthly free quota threshold
    - Uploads file to Supabase Cloud Storage bucket 'receipts'
    - Triggers Gemini 1.5 Flash Visual parsing on receipt image
    - Evaluates Modulo-11 merchant juristic registration status
    - Stores structured receipt record state in database
    """
    user_id = current_user.id
    
    # 1. Evaluate current usage limits
    try:
        profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if not profile_res.data:
            user_plan = "free"
            ocr_count = 0
        else:
            profile = profile_res.data[0]
            user_plan = profile.get("plan") or "free"
            ocr_count = profile.get("ocr_count") or 0
    except Exception as e:
        print(f"Error checking OCR quota: {e}")
        user_plan = "free"
        ocr_count = 0

    if user_plan == "free" and ocr_count >= 10:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="QUOTA_EXCEEDED"
        )

    # 2. Read image bytes and validate type
    try:
        img_bytes = await file.read()
        if not img_bytes:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        # Validate that we can open it via Pillow
        Image.open(io.BytesIO(img_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    # 3. Check for duplicates using SHA-256 hash
    file_hash = hashlib.sha256(img_bytes).hexdigest()
    try:
        dup_res = supabase.table("receipts").select("id", "vendor", "amount").eq("user_id", user_id).eq("file_url", f"hash:{file_hash}").execute()
        if dup_res.data:
            dup_item = dup_res.data[0]
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"DUPLICATE_RECEIPT:{dup_item.get('vendor')}:{dup_item.get('amount')}"
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Duplicate scan error ignored: {e}")

    # 4. Trigger Gemini 1.5 Flash Visual OCR
    ocr_result = await run_gemini_ocr_raw(img_bytes)

    # 5. Extract and Validate Tax ID Modulo-11
    seller_tax_id = ocr_result.get("seller_tax_id")
    is_dbd_verified = False
    dbd_company_name = None
    cleaned_tax_id = "".join(c for c in str(seller_tax_id) if c.isdigit()) if seller_tax_id else ""

    if cleaned_tax_id and len(cleaned_tax_id) == 13:
        digits = [int(c) for c in cleaned_tax_id]
        total = sum(digits[i] * (13 - i) for i in range(12))
        check_digit = (11 - (total % 11)) % 10
        if digits[12] == check_digit:
            is_dbd_verified = True
            dbd_dictionary = {
                "0107542000011": "บริษัท ซีพี ออลล์ จำกัด (มหาชน)",
                "0107561000242": "บริษัท ปตท. น้ำมันและการค้าปลีก จำกัด (มหาชน)",
                "0105536092641": "บริษัท เอก-ชัย ดีสทริบิวชั่น ซิสเทม จำกัด",
                "0105539021206": "บริษัท เซ็นทรัล ฟู้ด รีเทล จำกัด",
            }
            dbd_company_name = dbd_dictionary.get(cleaned_tax_id) or f"บริษัท {ocr_result.get('vendor', 'คู่ค้า')} จำกัด"

    # 6. Upload image to Supabase Storage pathed under user_id
    file_name = f"{uuid.uuid4().hex}.jpg"
    public_url = await upload_to_supabase_storage_raw(user_id, file_name, img_bytes)

    # 7. Write record into Supabase Receipts database
    confidence = ocr_result.get("confidence", 100)
    status_label = "completed" if confidence >= 70 else "pending_review"
    description = ocr_result.get("description") or "สแกนผ่านระบบ Web OCR"

    try:
        new_receipt = supabase.table("receipts").insert({
            "user_id": user_id,
            "file_name": file_name,
            "file_url": public_url or f"hash:{file_hash}",
            "file_size": len(img_bytes),
            "mime_type": "image/jpeg",
            "vendor": ocr_result.get("vendor", "ไม่ระบุ"),
            "amount": ocr_result.get("amount"),
            "date": ocr_result.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "category": ocr_result.get("category") or "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ",
            "description": description,
            "seller_tax_id": cleaned_tax_id or None,
            "is_dbd_verified": is_dbd_verified,
            "dbd_company_name": dbd_company_name,
            "status": status_label,
            "source": "web_client"
        }).execute()
        
        if not new_receipt.data:
            raise HTTPException(status_code=500, detail="Database write failed")
            
        receipt_data = new_receipt.data[0]
        
        # 8. Increment dynamic OCR quota usage count
        new_ocr_count = ocr_count + 1
        supabase.table("profiles").update({"ocr_count": new_ocr_count}).eq("id", user_id).execute()

        # 9. If confidence is high, auto-populate transaction ledger to sync dashboard
        if status_label == "completed":
            supabase.table("transactions").insert({
                "user_id": user_id,
                "date": receipt_data["date"],
                "name": f"{receipt_data['vendor']} (สแกนผ่านเว็บ)",
                "amount": receipt_data["amount"] or 0.0,
                "type": "expense",
                "category": receipt_data["category"],
                "is_tax_deductible": is_dbd_verified,
                "note": f"สแกนบิล ID: {receipt_data['id']} | DBD: {is_dbd_verified}",
                "status": "completed",
                "source": "web_client"
            }).execute()

        return receipt_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record scanned receipt: {str(e)}"
        )

async def run_gemini_ocr_raw(img_bytes: bytes) -> dict:
    if not settings.GEMINI_API_KEY:
        # Fallback Mock Data for local offline environments
        return {
            "vendor": "7-Eleven",
            "amount": 1335.00,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "category": "ต้นทุนสินค้า/วัตถุดิบ",
            "description": "ซื้อบะหมี่กึ่งสำเร็จรูปและบรรจุภัณฑ์ (ระบบ Offline Mock)",
            "seller_tax_id": "0107542000011",
            "confidence": 98
        }
    try:
        image = Image.open(io.BytesIO(img_bytes))
        prompt = f"""
        วิเคราะห์รูปภาพบิลใบเสร็จ/สลิปโอนเงินนี้ และดึงข้อมูลสำหรับภาษีและบัญชีไทย
        ส่งผลลัพธ์กลับมาเป็น JSON เปล่าๆ ห้ามมีคำอธิบายเพิ่มเติม ห้ามมี ```json markdown wrapper
        รูปแบบ JSON ที่ต้องส่งคืน:
        {{
          "vendor": "ชื่อผู้ขายหรือชื่อร้านค้า ถ้าหาไม่พบระบุ 'ไม่ระบุ'",
          "amount": ยอดเงินสุทธิรวมทั้งหมด (ตัวเลข float เช่น 450.50 หรือ null ถ้าหาไม่พบ),
          "date": "วันที่ทำรายการ (รูปแบบ YYYY-MM-DD เช่น 2026-05-28 หรือ null ถ้าหาไม่พบ)",
          "category": "เลือกหมวดหมู่ที่ใช่ที่สุด 1 หมวดจาก: {', '.join(CATEGORIES)}",
          "description": "รายละเอียดสินค้าคร่าวๆ",
          "seller_tax_id": "เลขประจำตัวผู้เสียภาษีอากร 13 หลักของผู้ขาย (ถ้ามี หรือระบุ null)",
          "confidence": ความมั่นใจในการดึงข้อมูลตัวเลขและอักขระ (ตัวเลขจำนวนเต็ม 0 ถึง 100)"
        }}
        """
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content([image, prompt])
        res_text = response.text.strip()

        if res_text.startswith("```"):
            res_text = res_text.split("\n", 1)[1]
            if res_text.endswith("```"):
                res_text = res_text.rsplit("\n", 1)[0]
            res_text = res_text.replace("json", "", 1).strip()

        return json.loads(res_text)
    except Exception as e:
        print(f"Gemini API parse failed: {e}")
        return {
            "vendor": "ไม่ระบุ (สแกนพลาด)",
            "amount": None,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "category": "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ",
            "description": f"เกิดข้อผิดพลาดในการรันโมเดล: {e}",
            "seller_tax_id": None,
            "confidence": 0
        }

async def upload_to_supabase_storage_raw(user_id: str, file_name: str, img_bytes: bytes) -> str:
    try:
        path = f"{user_id}/{file_name}"
        url = f"{settings.SUPABASE_URL}/storage/v1/object/receipts/{path}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            "Content-Type": "image/jpeg"
        }
        async with httpx.AsyncClient() as client:
            res = await client.post(url, headers=headers, content=img_bytes)
            if res.status_code == 200:
                return f"{settings.SUPABASE_URL}/storage/v1/object/public/receipts/{path}"
    except Exception as e:
        print(f"Web scan storage upload error: {e}")
    return ""
