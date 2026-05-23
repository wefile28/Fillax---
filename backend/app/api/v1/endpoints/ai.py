from fastapi import APIRouter, Depends, HTTPException, status, Request
import anthropic
from app.core.config import settings
from app.db.supabase import supabase, get_current_user
from app.core.security import chat_limiter, sanitize_text, scan_for_threats, mask_pii, SafeBaseModel
from typing import Any, List, Optional

router = APIRouter()

from collections import defaultdict
# Timezone-aware in-memory monthly chat quota tracker for Free tier users
# Structure: {user_id: {month_key: count}}
_user_monthly_chats = defaultdict(lambda: defaultdict(int))

# Initialize Anthropic Client
try:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
except Exception as e:
    client = None
    print(f"Warning: Anthropic client failed to initialize: {e}")

SYSTEM_PROMPT = """คุณคือ TaxMate AI ผู้ช่วยให้ข้อมูลภาษีสำหรับแม่ค้าออนไลน์ไทย

หลักการสำคัญ:
1. ตอบเป็นภาษาไทยเสมอ ใช้ภาษาง่าย เข้าใจได้โดยไม่ต้องมีพื้นฐานบัญชี
2. ให้ข้อมูลทั่วไปและทิศทางที่ควรทำ ไม่ใช่ตัวเลขแน่นอน
3. ทุกคำตอบต้องจบด้วย "ควรปรึกษานักบัญชีหรือกรมสรรพากรโดยตรงสำหรับกรณีเฉพาะของคุณ"
4. ห้ามให้ตัวเลขภาษีที่แน่นอนโดยไม่มี context ครบถ้วน
5. ถ้าถามนอกเรื่องภาษี ให้บอกว่าช่วยได้เฉพาะเรื่องภาษีแม่ค้าออนไลน์

บริบทพื้นฐาน:
- ผู้ใช้คือแม่ค้าออนไลน์ในไทย ส่วนใหญ่ขายผ่าน Shopee, Lazada, TikTok Shop, Facebook
- เน้นภาษีบุคคลธรรมดา (ไม่ใช่นิติบุคคล)
- ปีภาษีไทย = ปีปฏิทิน (1 ม.ค. – 31 ธ.ค.)
- Deadline ภ.ง.ด.90 = 31 มีนาคม ของปีถัดไป
- เกณฑ์ VAT = 1,800,000 บาท/ปี
"""

class ChatMessage(SafeBaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(SafeBaseModel):
    messages: List[ChatMessage]
    user_context: Optional[dict] = {}     # รายรับปัจจุบัน, ช่องทางขาย ฯลฯ

@router.post("/chat")
async def chat(
    request: Request,
    req: ChatRequest,
    current_user: Any = Depends(get_current_user)
):
    """
    AI Chatbot ตอบคำถามภาษีภาษาไทย
    ดึงข้อมูลธุรกรรม รายรับรายจ่าย และการลดหย่อนของตัวผู้ใช้เองมาวิเคราะห์ร่วมด้วยแบบ Real-time
    """
    # 1. Secure IP-based sliding window rate-limiter
    await chat_limiter.check(request, "ai_chat")

    # 2. XSS, Threat scanning, and PII Masking Privacy Shield
    client_ip = request.client.host if request.client else "unknown"
    for msg in req.messages:
        # Scan for SQLi, XSS, and Path Traversal threats (WAF)
        scan_for_threats(msg.content, client_ip)
        # Strip control characters and sanitize
        msg.content = sanitize_text(msg.content)
        # Mask National IDs, Credit Cards, Emails, and Phone Numbers (Privacy Shield)
        msg.content = mask_pii(msg.content)

    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Assistant service is currently unavailable. Please verify API key."
        )

    try:
        # 1. Query real financial data for contextual AI response
        ytd_income = 0.0
        ytd_expense = 0.0
        active_channels = []
        allowance_count = 0
        
        # Get profiles info
        prof_res = supabase.table("profiles").select("*").eq("id", current_user.id).execute()
        if prof_res.data and len(prof_res.data) > 0:
            profile = prof_res.data[0]
            active_channels = profile.get("shop_channels") or []
            
            # Enforce monthly free quota if user is not Pro/Agency
            user_plan = profile.get("plan", "free")
            if user_plan not in ["pro", "agency"]:
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                month_key = f"{now.year}-{now.month:02d}"
                
                user_id_str = str(current_user.id)
                current_chats = _user_monthly_chats[user_id_str][month_key]
                if current_chats >= 5:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="AI Tax Assistant chat quota (5 questions per month) exceeded. Please upgrade to Pro."
                    )
                
                # Increment quota count for this user
                _user_monthly_chats[user_id_str][month_key] += 1
            
        # Get YTD transaction summary
        tx_res = supabase.table("transactions").select("amount", "type", "channel").eq("user_id", current_user.id).execute()
        if tx_res.data:
            for tx in tx_res.data:
                amount = float(tx["amount"])
                if tx["type"] == "income":
                    ytd_income += amount
                    chan = tx.get("channel")
                    if chan and chan not in active_channels:
                        active_channels.append(chan)
                else:
                    ytd_expense += amount
                    
        # Get allowances count
        allow_res = supabase.table("user_deductions").select("id").eq("user_id", current_user.id).eq("is_applicable", True).execute()
        if allow_res.data:
            allowance_count = len(allow_res.data)
            
        # 2. Enrich system prompt with real database context
        user_context_str = f"""
ข้อมูลทางการเงินปัจจุบันของผู้ใช้คนนี้จากฐานข้อมูล (ใช้เพื่อตอบคำถามอย่างเป็นส่วนตัว):
- ยอดรายรับสะสมปีนี้ (YTD Income): ฿{ytd_income:,.2f}
- ยอดรายจ่ายสะสมปีนี้ (YTD Expense): ฿{ytd_expense:,.2f}
- กำไรเบื้องต้น (Net Profit): ฿{(ytd_income - ytd_expense):,.2f}
- ช่องทางการขายที่บันทึกไว้: {', '.join(active_channels) if active_channels else 'ยังไม่มีข้อมูลหรือระบุเป็นช่องทางอื่นๆ'}
- จำนวนรายการลดหย่อนภาษีที่กรอกไว้: {allowance_count} รายการ
- สถานะขีดจำกัดภาษีมูลค่าเพิ่ม (VAT 1.8M): {"เกินเกณฑ์จด VAT แล้ว! (ระวังความเสี่ยงด้านภาษีมูลค่าเพิ่ม)" if ytd_income >= 1800000 else f"ปลอดภัย (ยังเหลืออีก ฿{(1800000 - ytd_income):,.2f} จะถึงเกณฑ์เลี่ยงไม่ได้)"}
"""
        
        system = SYSTEM_PROMPT + "\n" + user_context_str
        
        # 3. Call Anthropic Claude API
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1000,
            system=system,
            messages=[{"role": m.role, "content": m.content} for m in req.messages],
        )

        return {
            "reply": response.content[0].text,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
