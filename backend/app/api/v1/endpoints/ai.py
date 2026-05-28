from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.db.supabase import supabase, get_current_user
from app.core.config import settings
from app.core.security import sanitize_text, mask_pii
import google.generativeai as genai
from datetime import datetime, timezone

router = APIRouter()

# Configure Gemini AI
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    ai_count: int
    plan: str

@router.post("/chat", response_model=ChatResponse)
async def ai_tax_chat(
    payload: ChatRequest,
    current_user: any = Depends(get_current_user)
):
    """
    Stateful AI Tax Advisor Chat endpoint.
    - Authenticates the user via Supabase session JWT
    - Enforces 5-free-questions monthly quota for 'free' tier profiles
    - Sanitizes input strings and masks sensitive PII data (IDs, credit cards, emails, phones)
    - Queries Gemini 1.5 Flash with tax expert guidelines
    - Returns structured answer and updated quota state
    """
    user_id = current_user.id
    
    # 1. Fetch user profile to check subscription status and AI quota usage
    try:
        profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if not profile_res.data:
            # If profile does not exist yet, initialize it
            profile_data = {
                "id": user_id,
                "full_name": current_user.email.split("@")[0] if current_user.email else "ผู้ประกอบการ",
                "seller_type": "individual",
                "plan": "free",
                "ocr_count": 0,
                "ai_count": 0
            }
            supabase.table("profiles").insert(profile_data).execute()
            user_plan = "free"
            ai_count = 0
        else:
            profile = profile_res.data[0]
            user_plan = profile.get("plan") or "free"
            ai_count = profile.get("ai_count") or 0
    except Exception as e:
        print(f"Error fetching profile: {e}")
        user_plan = "free"
        ai_count = 0

    # 2. Enforce limits for free plan (5 chats per month)
    if user_plan == "free" and ai_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="QUOTA_EXCEEDED"
        )

    # 3. Sanitize and mask sensitive input data
    sanitized_input = sanitize_text(payload.message)
    masked_input = mask_pii(sanitized_input)

    # 4. Invoke Gemini 1.5 Flash
    if not settings.GEMINI_API_KEY:
        # Fallback simulation if key is not configured
        reply = (
            "สวัสดีค่ะ! ฉันคือผู้ช่วยภาษีอัจฉริยะ Fillax ยินดีต้อนรับเข้าสู่การทดสอบระบบค่ะ "
            "เนื่องจากไม่พบการตั้งค่า GEMINI_API_KEY นี่คือคำตอบทดสอบภาษีสำหรับคุณ: "
            f"คำถามที่คุณพิมพ์เข้ามาคือ: '{masked_input}'"
        )
    else:
        try:
            system_instruction = (
                "คุณคือผู้เชี่ยวชาญด้านบัญชีและภาษีของประเทศไทย (Juristic Tax Advisor) ทำงานให้กับแอปพลิเคชัน Fillax "
                "หน้าที่ของคุณคือการให้คำปรึกษาภาษีอย่างชาญฉลาด ถูกต้องตามประมวลรัษฎากรไทยสำหรับฟรีแลนซ์ แม่ค้าพ่อค้าออนไลน์ "
                "และผู้ประกอบการขนาดกลางและย่อม (SMEs) โดยให้คำปรึกษาที่เป็นประโยชน์ มีความสุภาพเรียบร้อย "
                "ใช้คำแทนตัวว่า 'ดิฉัน' หรือ 'ผู้ช่วยภาษี Fillax' และลงท้ายด้วย 'ค่ะ'\n\n"
                "คำแนะนำทางกฎหมายสำคัญ: ทุกครั้งที่ตอบเสร็จสิ้น คุณต้องระบุคำเตือน (Disclaimer) เสมอว่า "
                "ข้อมูลนี้เป็นเพียงการประเมินเบื้องต้นตามประมวลรัษฎากรเท่านั้น และไม่ใช่การให้คำปรึกษากฎหมายเป็นทางการ "
                "ผู้ใช้ควรปรึกษาสำนักงานบัญชีหรือที่ปรึกษาภาษีวิชาชีพก่อนนำข้อมูลไปยื่นจริงทุกครั้ง"
            )
            
            models_to_try = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash']
            reply = ""
            last_error = None
            
            for model_name in models_to_try:
                try:
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(
                        f"{system_instruction}\n\nคำถามจากผู้ใช้: {masked_input}"
                    )
                    reply = response.text.strip()
                    break
                except Exception as ex:
                    last_error = ex
                    continue
            
            if not reply:
                # If rate-limited or quota exceeded, reply with a helpful message explaining the limit
                reply = (
                    "สวัสดีค่ะ! ดิฉันขอประทานอภัยด้วยนะคะ เนื่องจากความหนาแน่นของการใช้บริการระบบปัญญาประดิษฐ์ประเมินภาษีสูงมาก "
                    "ทำให้โควตาคำถามของกูเกิล (Gemini API Free Quota) บนกุญแจเซิร์ฟเวอร์ระบบนี้เกินพิกัดการใช้งานชั่วคราวค่ะ "
                    "แต่ผู้ช่วย Fillax ยังยินดีวิเคราะห์รายจ่ายและบันทึก มค.๑ ให้คุณต่อไปได้เสถียร 100% เลยนะคะ! "
                    f"\n\n(รายละเอียดทางเทคนิค: {last_error})"
                )
        except Exception as e:
            print(f"Gemini API chat error: {e}")
            reply = f"❌ เกิดข้อผิดพลาดในการประมวลผลคำแนะนำภาษี: {str(e)}"

    # 5. Increment dynamic AI quota count for 'free' tier
    new_ai_count = ai_count + 1
    try:
        supabase.table("profiles").update({"ai_count": new_ai_count}).eq("id", user_id).execute()
    except Exception as e:
        print(f"Error updating AI count: {e}")

    return ChatResponse(
        reply=reply,
        ai_count=new_ai_count,
        plan=user_plan
    )
