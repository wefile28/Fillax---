from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from app.db.supabase import supabase, get_current_user
from app.core.config import settings
from app.core.security import SafeBaseModel
from typing import Any, Literal
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
    method: Literal['promptpay', 'credit_card']
    plan: Literal['pro', 'agency'] = "pro"
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
    
    # Server-Side Price Mapping & Validation (P1 Security Hardening)
    PLAN_PRICES = {
        "pro": 199.00,
        "agency": 499.00
    }
    
    if payment.plan not in PLAN_PRICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"แผนบริการ '{payment.plan}' ไม่ถูกต้องในระบบ Fillax"
        )
        
    expected_amount = PLAN_PRICES[payment.plan]
    if abs(payment.amount - expected_amount) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ยอดชำระเงินไม่ถูกต้องสำหรับแผน {payment.plan.upper()}: ระบุยอดเงินชำระ ฿{payment.amount:,.2f} แต่ราคาจริงคือ ฿{expected_amount:,.2f}"
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
                
            # PromptPay Asynchronous pending charge handling (P1 Pending Guard)
            if payment.method == "promptpay" and charge.status == "pending":
                return {
                    "status": "pending",
                    "message": "สร้างรายการชำระเงินพร้อมเพย์สำเร็จ กรุณาสแกนคิวอาร์โค้ดเพื่อชำระเงิน ระบบจะเปิดใช้งานแผนบริการให้คุณโดยอัตโนมัติทันทีที่ชำระเงินเสร็จสิ้น ⏳",
                    "charge_id": charge.id,
                    "plan": payment.plan
                }
                
            # If credit card and not successful
            if payment.method == "credit_card" and charge.status != "successful":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"การชำระเงินผ่านบัตรเครดิตไม่สำเร็จ (สถานะ: {charge.status})"
                )
        except HTTPException:
            raise
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
            amount_val = data.get("amount")  # in satangs, e.g. 19900
            currency_val = str(data.get("currency", "")).lower()
            
            if status_val == "successful" and user_id:
                # Webhook plan, amount, and currency validation (P2 security hardening)
                if plan_type not in ["pro", "agency"]:
                    print(f"[SECURITY_WEBHOOK_WARNING] Ignore upgrade for user {user_id}: Invalid plan '{plan_type}' in metadata.")
                    return {"status": "ignored", "detail": "Invalid plan type"}
                    
                if currency_val != "thb":
                    print(f"[SECURITY_WEBHOOK_WARNING] Ignore upgrade for user {user_id}: Currency must be THB, got '{currency_val}'.")
                    return {"status": "ignored", "detail": "Invalid currency"}
                    
                # Validate pricing mapping: Pro = 199.00 THB (19900 satangs), Agency = 499.00 THB (49900 satangs)
                PLAN_SATANGS = {
                    "pro": 19900,
                    "agency": 49900
                }
                expected_satangs = PLAN_SATANGS[plan_type]
                if amount_val != expected_satangs:
                    print(f"[SECURITY_WEBHOOK_WARNING] Ignore upgrade for user {user_id}: Amount mismatch for plan '{plan_type}'. Expected {expected_satangs} satangs, got {amount_val} satangs.")
                    return {"status": "ignored", "detail": "Amount mismatch"}
                
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
    import hashlib
    from app.core.security import validate_uploaded_file
    
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable.",
        )
        
    # Strict MIME and File size validation (max 10MB) (P3 Validate MIME/extension)
    await validate_uploaded_file(file)
    
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="รองรับเฉพาะไฟล์รูปภาพสลิปโอนเงินนามสกุล PNG, JPG หรือ WEBP เท่านั้น"
        )
        
    # Read raw image content
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
        
    # Step 1: Cryptographic Image Hash Deduplication (P1 Slip Authenticity Guard - Exact Match)
    file_hash = hashlib.sha256(content).hexdigest()
    try:
        dup_hash_res = supabase.table("payment_claims").select("id").eq("file_hash", file_hash).execute()
        if dup_hash_res.data and len(dup_hash_res.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="สลิปโอนเงินนี้เคยถูกอัปโหลดเพื่อเปิดใช้งานแผนบริการไปแล้วในระบบ ไม่สามารถใช้งานซ้ำได้"
            )
    except HTTPException:
        raise
    except Exception as db_err:
        print(f"[SLIP_VERIFY_DEDUPLICATION] Skip hash check due to DB error: {db_err}")
        
    client = None
    if settings.ANTHROPIC_API_KEY:
        try:
            # Initialize Anthropic Claude vision client
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        except Exception as e:
            print(f"Warning: Anthropic client failed to initialize: {e}")
        
    try:
        if not client:
            if settings.APP_ENV != "development":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="AI slip verification is currently unavailable in production mode."
                )
            # --- MOCK DEMO SIMULATION MODE ---
            # Automatically upgrade user to pro or agency based on filename or just pro by default
            filename_lower = file.filename.lower() if file.filename else ""
            amount = 499.00 if "agency" in filename_lower else 199.00
            target_plan = "agency" if amount == 499.00 else "pro"
            
            import uuid
            parsed_slip = {
                "success": True,
                "amount": amount,
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "time": datetime.utcnow().strftime("%H:%M:%S"),
                "receiver_promptpay": "0638497065",
                "receiver_name": "FILLAX CO., LTD.",
                "ref_id": f"MOCK_REF_{uuid.uuid4().hex[:12].upper()}"
            }
        else:
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
            
            # Call Anthropic Claude Vision Model
            response = client.messages.create(
                model=settings.ANTHROPIC_MODEL,
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
                
        # Step 2: Ref ID Deduplication Check (P2 Exact Matching Ref ID - eq match instead of ilike)
        ref_id = parsed_slip.get("ref_id")
        if ref_id:
            try:
                dup_ref_res = supabase.table("payment_claims").select("id").eq("ref_id", ref_id).execute()
                if dup_ref_res.data and len(dup_ref_res.data) > 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"สลิปโอนเงินที่มีรหัสอ้างอิง {ref_id} เคยถูกอัปโหลดเพื่อยืนยันไปแล้วในระบบ ไม่สามารถใช้งานซ้ำได้"
                    )
            except HTTPException:
                raise
            except Exception as db_err:
                print(f"[SLIP_VERIFY_REF_DEDUPLICATION] Exact Ref match error: {db_err}")

        # Step 3: Receiver Account Verification (P2 Production Receiver Validation - Exact Merchant keywords)
        receiver_name = str(parsed_slip.get("receiver_name", "")).upper()
        receiver_pp = str(parsed_slip.get("receiver_promptpay", ""))
        
        is_receiver_valid = False
        
        # Strictly enforce company account name keywords in production to prevent fake slips from other people
        if settings.APP_ENV == "production":
            allowed_keywords = ["FILLAX", "ฟิลแลกซ์"]
        else:
            allowed_keywords = ["FILLAX", "ฟิลแลกซ์", "WEFILE28", "SOMCHAI", "สมชาย"]
        
        for kw in allowed_keywords:
            if kw in receiver_name:
                is_receiver_valid = True
                break
                
        expected_pp = "0638497065"
        if receiver_pp and expected_pp in receiver_pp.replace("-", ""):
            is_receiver_valid = True
            
        if not is_receiver_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="สลิปโอนเงินนี้ไม่ใช่การโอนเงินเข้าบัญชีของ FILLAX (ไม่พบชื่อบัญชีผู้รับเงินทางการที่กำหนด) กรุณาโอนเงินเข้าบัญชี Fillax โดยตรงเท่านั้น"
            )
            
        # Step 4: Secure Data Reservation before Profile Update (P1 Swap Verification Order to mitigate Race Condition)
        try:
            ref_id_str = ref_id or "N/A"
            
            # 1. Insert to payment_claims table first to lock the transaction level
            claim_data = {
                "user_id": str(current_user.id),
                "ref_id": ref_id, # Can be None if not found, unique constraint allows multiple NULLs
                "file_hash": file_hash,
                "plan": target_plan,
                "amount": amount
            }
            claim_res = supabase.table("payment_claims").insert(claim_data).execute()
            
            if not claim_res.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="ไม่สามารถลงทะเบียนการเคลมชำระเงินในระบบได้"
                )
            
            claim_id = claim_res.data[0]["id"]
            
            # 2. Insert main expense receipt (auto-expense)
            # Use file_url = f"payment_claim:{file_hash}" (or similar format) which is safe and non-colliding
            # (Note: we will remove the unique index from schema.sql anyway, but this format is cleaner)
            main_res = supabase.table("receipts").insert({
                "user_id": str(current_user.id),
                "file_name": file.filename or "fillax_subscription_slip.jpg",
                "file_url": f"payment_claim:{file_hash}",
                "file_size": len(content),
                "mime_type": content_type,
                "vendor": "FILLAX CO., LTD.",
                "amount": amount,
                "date": parsed_slip.get("date") or datetime.utcnow().strftime("%Y-%m-%d"),
                "category": "ค่าซอฟต์แวร์/บริการดิจิทัล",
                "description": f"ชำระค่าบริการระบบ FILLAX แพลน {target_plan.upper()} อัตโนมัติ (Ref ID: {ref_id_str})",
                "seller_tax_id": "0107561000242",
                "is_dbd_verified": True,
                "dbd_company_name": "บริษัท ฟิลแลกซ์ จำกัด (มหาชน)",
                "status": "completed",
                "source": "payment"
            }).execute()
            
            if not main_res.data:
                # Rollback payment claim immediately
                supabase.table("payment_claims").delete().eq("id", claim_id).execute()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to record payment receipt transaction in database."
                )
                
            receipt_id = main_res.data[0]["id"]
            
        except HTTPException:
            raise
        except Exception as db_err:
            # Check if unique constraint failed on ref_id or file_hash
            db_err_str = str(db_err).lower()
            if "unique constraint" in db_err_str or "duplicate key" in db_err_str:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="สลิปโอนเงินนี้หรือรหัสอ้างอิงธุรกรรมนี้เคยถูกใช้เคลมบริการไปแล้วในระบบ ไม่สามารถเคลมซ้ำได้"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"ไม่สามารถบันทึกและล็อกหลักฐานการชำระเงินในระบบได้: {str(db_err)}"
            )

        # Step 5: Successful validation and token reservation! Now safely upgrade profile
        try:
            plan_expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat()
            
            supabase.table("profiles").update({
                "plan": target_plan,
                "plan_expires_at": plan_expires_at,
                "updated_at": "now()"
            }).eq("id", current_user.id).execute()
        except Exception as e:
            # Safe rollback of the locked resources if profile update crashes
            print(f"[SLIP_UPGRADE_FAIL] Failed to update user profile, rolling back reservation locks: {e}")
            try:
                # Rollback both records
                supabase.table("payment_claims").delete().eq("id", claim_id).execute()
                supabase.table("receipts").delete().eq("id", receipt_id).execute()
            except Exception as rollback_err:
                print(f"[ROLLBACK_FAIL] Failed to delete reservation: {rollback_err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"ระบบเปิดแพลนสมาชิกมีข้อขัดข้อง (ย้อนกลับการจองแล้ว): {str(e)}"
            )
            
        print(f"[SLIP_VERIFIED] User {current_user.id} successfully upgraded to {target_plan.upper()} via Bank Slip verification. Ref: {ref_id}")
        
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
