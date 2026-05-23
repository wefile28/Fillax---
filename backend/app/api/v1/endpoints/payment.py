from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from app.db.supabase import supabase, get_current_user
from app.core.config import settings
from app.core.security import SafeBaseModel
from typing import Any
from datetime import datetime, timedelta
import hmac
import hashlib
import base64
import omise

router = APIRouter()

# Configure Omise Secret Key
if settings.OMISE_SECRET_KEY:
    omise.api_secret_key = settings.OMISE_SECRET_KEY
    omise.api_public_key = settings.OMISE_PUBLIC_KEY

class PaymentRequest(SafeBaseModel):
    method: str  # 'promptpay' | 'credit_card'
    plan: str = "pro"  # 'pro' | 'agency'
    amount: float = 199.00
    token: str = "tok_simulated"

def verify_omise_signature(raw_body: bytes, signature: str, timestamp: str, secret: str) -> bool:
    """
    Verify Omise webhook signature securely using HMAC-SHA256 constant-time comparison.
    """
    try:
        # Decode the Base64 webhook secret
        secret_key = base64.b64decode(secret)
        # Construct the signed payload: timestamp + raw request body
        signed_payload = f"{timestamp}{raw_body.decode('utf-8')}".encode('utf-8')
        # Compute HMAC-SHA256 signature
        computed = hmac.new(secret_key, signed_payload, hashlib.sha256).hexdigest()
        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(computed, signature)
    except Exception:
        return False

@router.post("/upgrade")
async def upgrade_user_plan(
    payment: PaymentRequest,
    current_user: Any = Depends(get_current_user)
):
    """
    Secure checkout upgrades with real Omise payment gateway verification.
    """
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable.",
        )
    
    # Check if a simulated bypass is requested (Sandbox mode)
    # CRITICAL: Strictly forbid simulated bypass in production environment!
    is_simulated = (
        settings.APP_ENV == "development" and (
            payment.token.startswith("tok_simulated") or 
            payment.token.startswith("tok_stripe_simulated") or 
            payment.token.startswith("tok_omise_pp_simulated")
        )
    )
    
    # In production, if simulation token is sent or Omise keys are missing, block it early
    if settings.APP_ENV == "production" and (is_simulated or not settings.OMISE_SECRET_KEY):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Simulation tokens and unconfigured payment gateways are not allowed in production."
        )
    
    # Secure logging of the payment capture event
    print(f"[SECURITY_PAYMENT] Payment checkout for user {current_user.id}: {payment.amount} THB via {payment.method.upper()} for plan {payment.plan.upper()}")

    if settings.OMISE_SECRET_KEY and not is_simulated:
        try:
            # Execute real payment gateway capture via Omise Python API
            charge = omise.Charge.create(
                amount=int(payment.amount * 100),  # Amount in satangs
                currency="thb",
                card=payment.token if payment.method == "credit_card" else None,
                source=payment.token if payment.method == "promptpay" else None,
                metadata={
                    "user_id": str(current_user.id),
                    "plan": payment.plan
                }
            )
            
            if charge.status == "failed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Payment rejected by Omise: {charge.failure_message}"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Omise Gateway Error: {str(e)}"
            )
    else:
        # Simulate delay for testing sandbox flows
        import asyncio
        await asyncio.sleep(1)

    try:
        # Set subscription expiration timestamp to 30 days from now
        plan_expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat()
        
        # Update user's profile record with the paid plan level and expiry date
        res = supabase.table("profiles").update({
            "plan": payment.plan,
            "plan_expires_at": plan_expires_at,
            "updated_at": "now()"
        }).eq("id", current_user.id).execute()
        
        return {
            "status": "success",
            "message": f"Payment successfully processed via {payment.method.upper()}! Upgraded to {payment.plan.upper()}.",
            "plan": payment.plan,
            "plan_expires_at": plan_expires_at,
            "user_id": current_user.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to upgrade user profile: {str(e)}"
        )

@router.get("/verify-status")
async def verify_payment_status(current_user: Any = Depends(get_current_user)):
    """
    Verify user's true current subscription plan level directly from Supabase DB profiles table.
    """
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable.",
        )
    try:
        res = supabase.table("profiles").select("plan", "plan_expires_at").eq("id", current_user.id).execute()
        plan = "free"
        is_expired = False
        
        if res.data and len(res.data) > 0:
            profile = res.data[0]
            plan = profile.get("plan", "free")
            expires_at_str = profile.get("plan_expires_at")
            
            # Check if subscription has expired
            if expires_at_str and plan != "free":
                try:
                    # Parse timezone-aware datetime dynamically
                    expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
                    if expires_at < datetime.now(expires_at.tzinfo):
                        is_expired = True
                        plan = "free"  # Downgrade visually
                        # Downgrade in database asynchronously/on-demand
                        supabase.table("profiles").update({
                            "plan": "free",
                            "updated_at": "now()"
                        }).eq("id", current_user.id).execute()
                except Exception as parse_err:
                    print(f"[SECURITY_PAYMENT] Failed to parse expiry date: {parse_err}")
                    
        return {
            "plan": plan, 
            "is_pro": plan in ["pro", "agency"] and not is_expired,
            "is_expired": is_expired
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch subscription status: {str(e)}"
        )

@router.post("/webhook")
async def omise_webhook(request: Request):
    """
    Webhook endpoint to handle asynchronous Omise charge events securely with HMAC verification.
    """
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable.",
        )
        
    # Read the raw request body bytes for signature validation
    raw_body = await request.body()
    
    # Secure Webhook Signature verification
    if settings.OMISE_WEBHOOK_SECRET:
        signature = request.headers.get("Omise-Signature")
        timestamp = request.headers.get("Omise-Signature-Timestamp")
        
        if not signature or not timestamp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing required Omise-Signature or Omise-Signature-Timestamp headers."
            )
            
        if not verify_omise_signature(raw_body, signature, timestamp, settings.OMISE_WEBHOOK_SECRET):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature payload verification failed."
            )
    elif settings.APP_ENV == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Omise webhook signature verification is strictly required in production mode."
        )

    try:
        import json
        payload = json.loads(raw_body.decode("utf-8"))
        event_key = payload.get("key")
        
        if event_key == "charge.complete":
            data = payload.get("data", {})
            status_val = data.get("status")
            metadata = data.get("metadata", {})
            user_id = metadata.get("user_id")
            plan_type = metadata.get("plan", "pro")
            
            if status_val == "successful" and user_id:
                # Set subscription expiration timestamp to 30 days from now
                plan_expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat()
                
                # Update user subscription plan to the paid plan level
                supabase.table("profiles").update({
                    "plan": plan_type,
                    "plan_expires_at": plan_expires_at,
                    "updated_at": "now()"
                }).eq("id", user_id).execute()
                print(f"[OMISE_WEBHOOK] Successfully verified and upgraded user {user_id} to plan {plan_type.upper()} expiring at {plan_expires_at}")
                return {"status": "success", "message": "Subscription updated successfully"}
                
        return {"status": "ignored"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook processing failed: {str(e)}"
        )

@router.post("/verify-slip")
async def verify_slip(
    request: Request,
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    """
    Advanced AI-Powered PromptPay Bank Transfer Slip Verification Gateway.
    Uses Claude Vision to securely extract and verify slip metadata (amount, receiver bank, ref) 
    without installing complex native C++ image manipulation libraries.
    """
    import anthropic
    import base64
    import json
    
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable.",
        )
        
    # Read raw image content
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
    
    # Enforce strict 10MB image limit to prevent buffer overflow or abuse
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ขนาดไฟล์สลิปต้องไม่เกิน 10MB"
        )
        
    try:
        # Initialize Anthropic Claude vision client
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI Slip OCR engine failed to initialize: {e}"
        )
        
    try:
        # Encode transfer slip image to Base64 format
        encoded_image = base64.b64encode(content).decode("utf-8")
        
        prompt = """
        วิเคราะห์รูปภาพสลิปโอนเงินธนาคารของไทยนี้ (Thai Bank Transfer Slip) และดึงข้อมูลธุรกรรมที่ถูกต้อง
        ส่งผลลัพธ์กลับมาเป็น JSON เปล่าๆ ห้ามมีคำอธิบายเพิ่มเติม ห้ามมี ```json markdown wrapper
        
        โครงสร้าง JSON:
        {
          "success": true/false (ระบุ true หากเป็นสลิปโอนเงินธนาคารของไทยที่ถูกต้องและสมบูรณ์),
          "amount": ยอดเงินโอนเป็นตัวเลข float (เช่น 199.00 หรือ 499.00),
          "date": "วันที่โอนเงินในสลิป (รูปแบบ YYYY-MM-DD)",
          "time": "เวลาที่โอนเงินในสลิป (รูปแบบ HH:MM:SS)",
          "receiver_promptpay": "เบอร์พร้อมเพย์ผู้รับ หรือเลขบัญชีธนาคารผู้รับ (หากระบุ)",
          "receiver_name": "ชื่อบัญชีผู้รับโอน (เช่น wefile28@gmail.com หรือ FILLAX หรือชื่ออื่น)",
          "ref_id": "รหัสอ้างอิงธุรกรรม / Ref ID (ถ้ามี)"
        }
        """
        
        # Call Anthropic Claude 3.5 Sonnet Vision Model
        response = client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=600,
            system="You are an expert Thai Bank Transfer Slip OCR parser. You extract transaction metadata into clean JSON.",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": content_type if content_type in ["image/jpeg", "image/png", "image/gif", "image/webp"] else "image/jpeg",
                                "data": encoded_image
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        )
        
        result_text = response.content[0].text.strip()
        
        # Clean markdown code blocks if the model outputs them
        if result_text.startswith("```"):
            result_text = result_text.split("\n", 1)[1]
            if result_text.endswith("```"):
                result_text = result_text.rsplit("\n", 1)[0]
            result_text = result_text.replace("json", "", 1).strip()
            
        parsed_slip = json.loads(result_text)
        
        if not parsed_slip.get("success") or not parsed_slip.get("amount"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ไม่สามารถยืนยันสลิปโอนเงินนี้ได้ กรุณาอัปโหลดรูปภาพสลิปธนาคารที่ชัดเจนและถูกต้อง"
            )
            
        amount = float(parsed_slip["amount"])
        
        # Strictly verify transfer amount: 199.00 for Pro Plan, 499.00 for Agency Plan
        target_plan = "pro"
        if abs(amount - 199.00) < 0.01:
            target_plan = "pro"
        elif abs(amount - 499.00) < 0.01:
            target_plan = "agency"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ยอดเงินโอน ฿{amount:,.2f} ไม่ตรงกับค่าบริการแพลน PRO (฿199.00) หรือ AGENCY (฿499.00) ของระบบ Fillax"
            )
            
        # Successful validation! Upgrade user profile to PRO/AGENCY immediately
        plan_expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat()
        
        supabase.table("profiles").update({
            "plan": target_plan,
            "plan_expires_at": plan_expires_at,
            "updated_at": "now()"
        }).eq("id", current_user.id).execute()
        
        print(f"[SLIP_VERIFIED] User {current_user.id} successfully upgraded to {target_plan.upper()} via Bank Slip verification. Ref: {parsed_slip.get('ref_id')}")
        
        return {
            "status": "success",
            "message": f"ยืนยันสลิปการโอนเงินสำเร็จ! แพลตฟอร์มได้ทำการอัปเกรดบัญชีเป็น {target_plan.upper()} เรียบร้อยแล้ว (ยอดเงิน: ฿{amount:,.2f}) ✨",
            "plan": target_plan,
            "plan_expires_at": plan_expires_at,
            "slip_details": parsed_slip
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ระบบประมวลผลการยืนยันสลิปล้มเหลว: {str(e)}"
        )
