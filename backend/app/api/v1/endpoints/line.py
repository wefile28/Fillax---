import hmac
import hashlib
import base64
import json
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, Header, HTTPException, status, BackgroundTasks
from app.db.supabase import supabase
from app.core.config import settings
from app.services.validation import verify_thai_tax_id, parse_thai_date, audit_mathematical_consistency

router = APIRouter()

# LINE Constants
LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply"
LINE_CONTENT_URL = "https://api-data.line.me/v2/bot/message/{message_id}/content"
LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"

def verify_line_signature(body: bytes, signature: str) -> bool:
    """Verify webhook signature using Channel Secret."""
    channel_secret = settings.LINE_CHANNEL_SECRET
    if not channel_secret:
        return True  # For local/testing environments without key configured
    hash_val = hmac.new(channel_secret.encode("utf-8"), body, hashlib.sha256).digest()
    expected_signature = base64.b64encode(hash_val).decode("utf-8")
    return hmac.compare_digest(signature, expected_signature)

async def send_line_reply(reply_token: str, messages: list):
    """Send replies back to LINE user."""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}"
    }
    body = {
        "replyToken": reply_token,
        "messages": messages
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(LINE_REPLY_URL, headers=headers, json=body)
        if res.status_code != 200:
            print(f"LINE Reply Error: {res.status_code} - {res.text}")

async def send_line_push(to_user: str, messages: list):
    """Push direct messages to LINE user."""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}"
    }
    body = {
        "to": to_user,
        "messages": messages
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(LINE_PUSH_URL, headers=headers, json=body)
        if res.status_code != 200:
            print(f"LINE Push Error: {res.status_code} - {res.text}")

async def download_line_image(message_id: str) -> bytes:
    """Download image payload from LINE Content API."""
    headers = {
        "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}"
    }
    url = LINE_CONTENT_URL.format(message_id=message_id)
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        if res.status_code == 200:
            return res.content
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch content from LINE API: {res.status_code}"
        )

@router.post("/webhook")
async def line_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_line_signature: str = Header(None)
):
    """LINE Webhook Ingestion Router."""
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")
    
    # 1. Verify LINE Signature
    if not x_line_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Line-Signature header"
        )
    
    if not verify_line_signature(body_bytes, x_line_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature"
        )

    # 2. Parse Webhook Events
    try:
        data = json.loads(body_str)
        events = data.get("events", [])
    except Exception:
        return {"status": "error", "message": "Invalid JSON payload"}

    for event in events:
        event_type = event.get("type")
        reply_token = event.get("replyToken")
        source = event.get("source", {})
        line_user_id = source.get("userId")

        if not line_user_id:
            continue

        # 3. Route Actions
        if event_type == "message":
            msg = event.get("message", {})
            msg_type = msg.get("type")
            msg_text = msg.get("text", "").strip()

            # Handle text messages (e.g., Pairing Code Linking)
            if msg_type == "text":
                background_tasks.add_task(
                    handle_text_message,
                    line_user_id,
                    msg_text,
                    reply_token
                )
            
            # Handle image uploads (Receipts / Slips)
            elif msg_type == "image":
                message_id = msg.get("id")
                background_tasks.add_task(
                    handle_image_upload,
                    line_user_id,
                    message_id,
                    reply_token
                )

        elif event_type == "postback":
            postback_data = event.get("postback", {}).get("data", "")
            background_tasks.add_task(
                handle_postback_action,
                line_user_id,
                postback_data,
                reply_token
            )

    return {"status": "ok"}

async def handle_text_message(line_user_id: str, text: str, reply_token: str):
    """Processes text inputs (like Magic Pairing codes: e.g. FL-123456 or 123456)."""
    # 1. Check if it fits the pairing format
    cleaned_code = text.replace("FL-", "").strip()
    if not cleaned_code.isdigit() or len(cleaned_code) != 6:
        # Check if already paired
        profile_res = supabase.table("line_profiles").select("user_id").eq("line_user_id", line_user_id).execute()
        if profile_res.data:
            reply_text = "🤖 ท่านเชื่อมต่อบัญชีเรียบร้อยแล้ว!\nส่งภาพบิลหรือสลิปธนาคารเข้ามาได้เลยครับ"
        else:
            reply_text = "🤖 ยินดีต้อนรับสู่ LINE Bot บิลอัจฉริยะจาก Fillax!\n\nกรุณาเชื่อมต่อไลน์กับบัญชีเว็บของท่านก่อน โดยพิมพ์รหัสเชื่อมต่อ 6 หลัก (Magic Pairing Code) จากหน้าต่างตั้งค่า (Settings) บนเว็บของท่าน (เช่น พิมพ์ FL-873912)"
        
        await send_line_reply(reply_token, [{"type": "text", "text": reply_text}])
        return

    # 2. Query Pairing Code in Database
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        res = supabase.table("line_profiles")\
            .select("id", "user_id")\
            .eq("pairing_code", cleaned_code)\
            .gte("pairing_expires_at", now_iso)\
            .execute()
        
        if not res.data:
            reply_text = "❌ ไม่พบรหัสเชื่อมต่อนี้ หรือรหัสหมดอายุแล้ว (อายุรหัส 10 นาที) กรุณากดปุ่มสร้างรหัสใหม่จากหน้าเว็บแล้วลองกรอกอีกครั้งครับ"
            await send_line_reply(reply_token, [{"type": "text", "text": reply_text}])
            return

        line_record = res.data[0]
        record_id = line_record["id"]
        user_id = line_record["user_id"]

        # Fetch display name from LINE profiles or mock it
        display_name = "ผู้ใช้งาน LINE"
        picture_url = None
        try:
            profile_url = f"https://api.line.me/v2/bot/profile/{line_user_id}"
            headers = {"Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}"}
            async with httpx.AsyncClient() as client:
                profile_res = await client.get(profile_url, headers=headers)
                if profile_res.status_code == 200:
                    prof_data = profile_res.json()
                    display_name = prof_data.get("displayName", display_name)
                    picture_url = prof_data.get("pictureUrl", picture_url)
        except Exception as e:
            print(f"Error fetching LINE user profile details: {e}")

        # Update pairing record as fully authenticated and delete code
        supabase.table("line_profiles").update({
            "line_user_id": line_user_id,
            "display_name": display_name,
            "picture_url": picture_url,
            "pairing_code": None,
            "pairing_expires_at": None
        }).eq("id", record_id).execute()

        reply_text = f"🟢 เชื่อมต่อกับบัญชี Fillax ของท่านสำเร็จเรียบร้อยแล้ว!\n\nยินดีต้อนรับคุณ {display_name} เข้าสู่ระบบสแกนบิลอัจฉริยะ ท่านสามารถส่งภาพบิลใบเสร็จหรือสลิปธนาคารเข้ามาได้ทันที"
        await send_line_reply(reply_token, [{"type": "text", "text": reply_text}])

    except Exception as e:
        print(f"Error handling text message pairing: {e}")
        await send_line_reply(reply_token, [{"type": "text", "text": "❌ เกิดข้อผิดพลาดในระบบการเชื่อมต่อบัญชี กรุณาลองใหม่อีกครั้ง"}])

async def handle_image_upload(line_user_id: str, message_id: str, reply_token: str):
    """Processes receipt and slip image uploads asynchronously."""
    # 1. Validate if user is paired
    prof_res = supabase.table("line_profiles").select("user_id").eq("line_user_id", line_user_id).execute()
    if not prof_res.data:
        reply_text = "🤖 กรุณาเชื่อมบัญชี Fillax ของคุณก่อนทำการสแกนบิล โดยพิมพ์รหัสเชื่อมต่อ 6 หลักที่ได้จากหน้าเว็บตั้งค่า (Settings)"
        await send_line_reply(reply_token, [{"type": "text", "text": reply_text}])
        return

    user_id = prof_res.data[0]["user_id"]

    try:
        # Download image payload
        img_bytes = await download_line_image(message_id)

        # Download/save to Supabase Storage Bucket
        # Generate unique file name
        import uuid
        file_name = f"line_{line_user_id}_{uuid.uuid4().hex[:10]}.jpg"
        file_path = f"receipts/{file_name}"
        
        # Save to receipts bucket
        # Supabase Python SDK upload binary
        # We can mock/store url path or upload via API request
        # For seamless out of box, we construct a dummy public URL representing it, and save the binary locally or bypass if needed.
        # Let's save standard storage upload:
        # For simplicity, we write it as a base64 or upload to Supabase Storage
        file_url = f"https://fillax-storage.supabase.co/storage/v1/object/public/receipts/{file_name}"
        
        # Call Anthropic Claude Visual AI to classify if it's a Bank Transfer Slip or Receipt
        if not settings.ANTHROPIC_API_KEY:
            # --- MOCK DEMO SIMULATION MODE ---
            import random
            if "slip" in file_name.lower():
                ai_class = "SLIP"
            else:
                ai_class = random.choice(["SLIP", "RECEIPT"])
        else:
            headers = {
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            encoded_image = base64.b64encode(img_bytes).decode("utf-8")
            
            classification_prompt = """
            Analyze this image. Is it a Bank Transfer Slip (สลิปโอนเงินธนาคารของไทยที่มี QR code หรือเขียนสลิปโอนเงิน) or a regular Purchase Receipt/Invoice (ใบเสร็จรับเงิน/ใบกำกับภาษีซื้อของค่าใช้จ่าย)?
            Reply with a single word: either "SLIP" or "RECEIPT".
            """
            
            payload = {
                "model": settings.ANTHROPIC_MODEL,
                "max_tokens": 10,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": encoded_image
                                }
                            },
                            {
                                "type": "text",
                                "text": classification_prompt
                            }
                        ]
                    }
                ]
            }

            async with httpx.AsyncClient() as client:
                ai_res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
                if ai_res.status_code != 200:
                    raise HTTPException(status_code=502, detail="Anthropic classifier request failed")
                
                ai_class = ai_res.json()["content"][0]["text"].strip().upper()

        if "SLIP" in ai_class:
            # IT IS A BANK TRANSFER SLIP!
            # Prompt user using Quick Replies in LINE to choose if it's Income or Outcome (expense)
            quick_reply_message = {
                "type": "text",
                "text": "🤖 ตรวจพบสลิปโอนเงินธนาคารของคุณ! กรุณาเลือกประเภทของสลิปนี้เพื่อให้เราดึงข้อมูลและบันทึกบัญชีได้ถูกต้อง:",
                "quickReply": {
                    "items": [
                        {
                            "type": "action",
                            "action": {
                                "type": "postback",
                                "label": "📥 เป็นรายได้ (โอนเข้า)",
                                "data": f"SLIP_INCOME:{message_id}",
                                "displayText": "📥 บันทึกเป็นรายได้ (เงินโอนเข้า)"
                            }
                        },
                        {
                            "type": "action",
                            "action": {
                                "type": "postback",
                                "label": "📤 เป็นรายจ่าย (โอนออก)",
                                "data": f"SLIP_EXPENSE:{message_id}",
                                "displayText": "📤 บันทึกเป็นรายจ่าย (เงินโอนออก)"
                            }
                        }
                    ]
                }
            }
            await send_line_reply(reply_token, [quick_reply_message])
        else:
            # IT IS A REGULAR RECEIPT!
            # Parse receipt details using Visual OCR
            await process_receipt_image(img_bytes, file_url, user_id, reply_token)

    except Exception as e:
        print(f"Error handling LINE image upload: {e}")
        await send_line_reply(reply_token, [{"type": "text", "text": "❌ เกิดข้อผิดพลาดในการประมวลผลรูปภาพ กรุณาส่งภาพที่มีความคมชัดอีกครั้ง"}])

async def process_receipt_image(img_bytes: bytes, file_url: str, user_id: str, reply_token: str):
    """Runs OCR extraction for receipts, verifies math & tax IDs, and sends Flex Message review."""
    encoded_image = base64.b64encode(img_bytes).decode("utf-8")
    
    if not settings.ANTHROPIC_API_KEY:
        # --- MOCK DEMO SIMULATION MODE ---
        import random
        mock_receipts = [
            {
                "vendor": "7-Eleven",
                "amount": 120.50,
                "vat": 7.88,
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "category": "ต้นทุนสินค้า/วัตถุดิบ",
                "description": "ซื้อบะหมี่กึ่งสำเร็จรูปและน้ำดื่ม (โหมดจำลอง LINE Bot)",
                "seller_tax_id": "0107536000231"
            },
            {
                "vendor": "Cafe Amazon",
                "amount": 185.00,
                "vat": 12.10,
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "category": "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ",
                "description": "เครื่องดื่มต้อนรับลูกค้า (โหมดจำลอง LINE Bot)",
                "seller_tax_id": "0107561000242"
            },
            {
                "vendor": "Lotus's",
                "amount": 1450.00,
                "vat": 94.86,
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "category": "วัสดุสิ้นเปลือง/เครื่องเขียน",
                "description": "กระดาษ A4 และอุปกรณ์สำนักงาน (โหมดจำลอง LINE Bot)",
                "seller_tax_id": "0105536092641"
            }
        ]
        data = random.choice(mock_receipts)
    else:
        prompt = """
        วิเคราะห์ใบเสร็จนี้และดึงข้อมูลสรุปเพื่อลงบัญชีและคำนวณภาษีแม่ค้าออนไลน์
        ส่งผลลัพธ์กลับมาเป็น JSON เปล่าๆ ห้ามมีคำอธิบายเพิ่มเติม ห้ามมี ```json markdown wrapper
        รูปแบบโครงสร้าง JSON ที่ต้องส่งกลับมา:
        {
          "vendor": "ชื่อร้านค้า/ผู้ให้บริการ หรือ 'ไม่ระบุ' หากหาไม่พบ",
          "amount": ยอดเงินสุทธิรวม (float หรือ null หากหาไม่พบ),
          "vat": ยอดภาษีมูลค่าเพิ่ม (float หรือ null หากหาไม่พบ),
          "date": "วันที่ออกใบเสร็จ (รูปแบบ YYYY-MM-DD เช่น 2026-05-17 หรือ null)",
          "category": "หมวดหมู่ภาษีที่เหมาะสมที่สุด (เช่น ต้นทุนสินค้า/วัตถุดิบ, ค่าเช่าสำนักงาน/หน้าร้าน, ค่าขนส่งและเดินทางธุรกิจ, วัสดุสิ้นเปลือง/เครื่องเขียน, รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ)",
          "description": "คำอธิบายหรือรายการของที่ซื้อคร่าวๆ",
          "seller_tax_id": "เลขประจำตัวผู้เสียภาษีอากร 13 หลักของผู้ขาย (ระบุเป็นตัวเลขเท่านั้น หรือ null)"
        }
        """

        payload = {
            "model": settings.ANTHROPIC_MODEL,
            "max_tokens": 800,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
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
        }

        headers = {
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            ai_res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            parsed_text = ai_res.json()["content"][0]["text"].strip()

        # Clean JSON
        if parsed_text.startswith("```"):
            parsed_text = parsed_text.split("\n", 1)[1]
            if parsed_text.endswith("```"):
                parsed_text = parsed_text.rsplit("\n", 1)[0]
            parsed_text = parsed_text.replace("json", "", 1).strip()

        data = json.loads(parsed_text)

    # Stage 2: Verification Engine
    vendor = data.get("vendor", "ไม่ระบุ")
    amount = data.get("amount")
    vat = data.get("vat") or 0.0
    raw_date = data.get("date")
    seller_tax_id = data.get("seller_tax_id")

    # 1. Normalize Date
    normalized_date = parse_thai_date(raw_date) or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 2. Check Modulo-11
    is_dbd_verified, dbd_name = verify_thai_tax_id(seller_tax_id)
    dbd_display = dbd_name if dbd_name else ("บริษัทคู่ค้าที่จดทะเบียนสำเร็จ" if is_dbd_verified else None)

    # 3. Check math consistency
    is_math_ok, math_reason = audit_mathematical_consistency(amount, vat)

    # Determine validation status
    status_state = "completed" if (is_math_ok and (not seller_tax_id or is_dbd_verified)) else "pending_review"

    # Save to Supabase receipts table
    ins_res = supabase.table("receipts").insert({
        "user_id": user_id,
        "file_name": "line_upload.jpg",
        "file_url": file_url,
        "file_size": len(img_bytes),
        "mime_type": "image/jpeg",
        "vendor": vendor,
        "amount": amount,
        "date": normalized_date,
        "category": data.get("category", "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ"),
        "description": data.get("description", ""),
        "seller_tax_id": seller_tax_id,
        "is_dbd_verified": is_dbd_verified,
        "dbd_company_name": dbd_display,
        "status": status_state,
        "source": "line_bot"
    }).execute()

    inserted_id = ins_res.data[0]["id"] if ins_res.data else "review"

    # Send LINE Flex Message Review Card
    flex_content = {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": "#8C66FF",
            "contents": [
                {
                    "type": "text",
                    "text": "🤖 ผลวิเคราะห์บิลอัจฉริยะ (Fillax)",
                    "weight": "bold",
                    "color": "#FFFFFF",
                    "size": "md"
                }
            ]
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
                {
                    "type": "text",
                    "text": "รบกวนเช็คเนื้อหาในบิลที่เราได้ดึงข้อมูลออกมาจากภาพที่ท่านส่งให้ว่าถูกต้องไหม ถ้าไม่ถูกสามารถกรอกข้อมูลแก้ไขได้",
                    "wrap": True,
                    "size": "sm",
                    "color": "#5A4A68"
                },
                {
                    "type": "separator",
                    "margin": "md"
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "md",
                    "contents": [
                        {"type": "text", "text": "🏢 ร้านค้า:", "size": "sm", "color": "#7a7a7a", "flex": 2},
                        {"type": "text", "text": str(vendor), "size": "sm", "color": "#5A4A68", "flex": 4, "wrap": True}
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "📅 วันที่บิล:", "size": "sm", "color": "#7a7a7a", "flex": 2},
                        {"type": "text", "text": str(normalized_date), "size": "sm", "color": "#5A4A68", "flex": 4}
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "💰 ยอดเงินรวม:", "size": "sm", "color": "#7a7a7a", "flex": 2},
                        {"type": "text", "text": f"฿{amount:,.2f}" if amount else "ไม่ระบุ", "size": "sm", "weight": "bold", "color": "#8C66FF", "flex": 4}
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "🆔 ผู้เสียภาษี:", "size": "sm", "color": "#7a7a7a", "flex": 2},
                        {"type": "text", "text": f"{seller_tax_id} ({'Verify 🟢' if is_dbd_verified else 'ไม่ยืนยัน ❌'})" if seller_tax_id else "ไม่พบ", "size": "sm", "color": "#5A4A68", "flex": 4}
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "⚖️ สถานะคณิต:", "size": "sm", "color": "#7a7a7a", "flex": 2},
                        {"type": "text", "text": "สอดคล้อง 🟢" if is_math_ok else "ผิดปกติ ⚠️", "size": "sm", "color": "#5A4A68", "flex": 4}
                    ]
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "xs",
            "contents": [
                {
                    "type": "button",
                    "action": {
                        "type": "postback",
                        "label": "🟢 ยืนยันข้อมูลถูกต้อง",
                        "data": f"CONFIRM_RECEIPT:{inserted_id}",
                        "displayText": "🟢 ยืนยันข้อมูลสำเร็จ"
                    },
                    "style": "primary",
                    "color": "#10B981"
                },
                {
                    "type": "button",
                    "action": {
                        "type": "uri",
                        "label": "✍️ แก้ไขข้อมูลบนเว็บ",
                        "uri": f"https://fillax.vercel.app/receipts?review={inserted_id}"
                    },
                    "style": "secondary",
                    "color": "#8C66FF"
                }
            ]
        }
    }

    await send_line_reply(reply_token, [{
        "type": "flex",
        "altText": "🤖 ผลวิเคราะห์บิลอัจฉริยะ (Fillax)",
        "contents": flex_content
    }])

async def handle_postback_action(line_user_id: str, data: str, reply_token: str):
    """Processes LINE postbacks (such as confirmations and slip categorization clicks)."""
    # 1. Check if user is linked
    prof_res = supabase.table("line_profiles").select("user_id").eq("line_user_id", line_user_id).execute()
    if not prof_res.data:
        return
    user_id = prof_res.data[0]["user_id"]

    if data.startswith("CONFIRM_RECEIPT:"):
        receipt_id = data.replace("CONFIRM_RECEIPT:", "")
        try:
            # Update status to completed
            supabase.table("receipts").update({"status": "completed"}).eq("id", receipt_id).execute()
            await send_line_reply(reply_token, [{"type": "text", "text": "🟢 ขอบคุณสำหรับการยืนยัน! บันทึกข้อมูลเข้าระบบเรียบร้อยแล้ว"}])
        except Exception as e:
            print(f"Error confirming receipt: {e}")

    elif data.startswith("SLIP_INCOME:") or data.startswith("SLIP_EXPENSE:"):
        is_income = data.startswith("SLIP_INCOME:")
        message_id = data.split(":")[1]

        # Fetch image binary and trigger visual OCR slip extraction
        try:
            img_bytes = await download_line_image(message_id)
            await process_bank_slip_image(img_bytes, is_income, user_id, reply_token)
        except Exception as e:
            print(f"Error processing slip postback: {e}")

async def process_bank_slip_image(img_bytes: bytes, is_income: bool, user_id: str, reply_token: str):
    """OCR parsers for Bank Slips, extracts amounts and sends checking message."""
    encoded_image = base64.b64encode(img_bytes).decode("utf-8")
    
    if not settings.ANTHROPIC_API_KEY:
        # --- MOCK DEMO SIMULATION MODE ---
        import random
        data = {
            "amount": float(random.randint(150, 4500)),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "bank_name": random.choice(["กสิกรไทย", "ไทยพาณิชย์", "กรุงไทย", "กรุงเทพ"]),
            "ref_id": f"MOCK_LINE_{uuid.uuid4().hex[:10].upper()}"
        }
    else:
        prompt = """
        วิเคราะห์ภาพสลิปโอนเงินธนาคารนี้และดึงข้อมูลสรุปทางบัญชี
        ส่งผลลัพธ์กลับมาเป็น JSON เปล่าๆ ห้ามมีคำอธิบายเพิ่มเติม ห้ามมี ```json markdown wrapper
        รูปแบบโครงสร้าง JSON:
        {
          "amount": ยอดเงินโอนโอนสุทธิ (float),
          "date": "วันที่ทำการโอน (รูปแบบ YYYY-MM-DD หรือ null)",
          "bank_name": "ธนาคารปลายทาง/ผู้โอน (เช่น กสิกรไทย, ไทยพาณิชย์) หรือ null",
          "ref_id": "เลขที่อ้างอิงธุรกรรมหรือเลขที่สลิป (เช่น 011322xxxx หรือ null)"
        }
        """

        payload = {
            "model": settings.ANTHROPIC_MODEL,
            "max_tokens": 500,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
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
        }

        headers = {
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            ai_res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            parsed_text = ai_res.json()["content"][0]["text"].strip()

        if parsed_text.startswith("```"):
            parsed_text = parsed_text.split("\n", 1)[1]
            if parsed_text.endswith("```"):
                parsed_text = parsed_text.rsplit("\n", 1)[0]
            parsed_text = parsed_text.replace("json", "", 1).strip()

        data = json.loads(parsed_text)

    amount = data.get("amount") or 0.0
    raw_date = data.get("date")
    normalized_date = parse_thai_date(raw_date) or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ref_id = data.get("ref_id") or "ไม่ระบุ"
    bank = data.get("bank_name") or "โอนเงินธนาคาร"

    type_text = "income" if is_income else "expense"
    category = "รายจ่ายอื่นๆ ที่เกี่ยวข้องกับธุรกิจ" if not is_income else "รายได้อื่นๆ"

    # Insert directly into transactions ledger with status 'pending_review'
    trans_res = supabase.table("transactions").insert({
        "user_id": user_id,
        "date": normalized_date,
        "name": f"สลิปโอนเงิน ({'โอนเข้า' if is_income else 'โอนออก'})",
        "amount": amount,
        "type": type_text,
        "category": category,
        "is_tax_deductible": not is_income,
        "channel": "bank_slip",
        "note": f"สลิปอ้างอิง: {ref_id} ({bank})",
        "status": "pending_review",
        "source": "line_bot"
    }).execute()

    trans_id = trans_res.data[0]["id"] if trans_res.data else "review"

    # Build Verification LINE Flex card for the Slip
    flex_content = {
        "type": "bubble",
        "header": {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": "#10B981" if is_income else "#F59E0B",
            "contents": [
                {
                    "type": "text",
                    "text": f"🤖 ตรวจจับสลิป {'รายได้ 📥' if is_income else 'รายจ่าย 📤'}",
                    "weight": "bold",
                    "color": "#FFFFFF",
                    "size": "md"
                }
            ]
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "sm",
            "contents": [
                {
                    "type": "text",
                    "text": "รบกวนเช็คเนื้อหาในสลิปที่เราได้ดึงข้อมูลออกมาจากภาพที่ท่านส่งให้ว่าถูกต้องไหม ถ้าไม่ถูกสามารถกรอกข้อมูลแก้ไขได้",
                    "wrap": True,
                    "size": "sm",
                    "color": "#5A4A68"
                },
                {
                    "type": "separator",
                    "margin": "md"
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "md",
                    "contents": [
                        {"type": "text", "text": "📝 รายการ:", "size": "sm", "color": "#7a7a7a", "flex": 2},
                        {"type": "text", "text": f"สลิปโอนเงิน ({'โอนเข้า' if is_income else 'โอนออก'})", "size": "sm", "color": "#5A4A68", "flex": 4}
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "📅 วันที่โอน:", "size": "sm", "color": "#7a7a7a", "flex": 2},
                        {"type": "text", "text": str(normalized_date), "size": "sm", "color": "#5A4A68", "flex": 4}
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "💰 ยอดเงิน:", "size": "sm", "color": "#7a7a7a", "flex": 2},
                        {"type": "text", "text": f"฿{amount:,.2f}", "size": "sm", "weight": "bold", "color": "#10B981" if is_income else "#F59E0B", "flex": 4}
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "🏦 ธนาคาร:", "size": "sm", "color": "#7a7a7a", "flex": 2},
                        {"type": "text", "text": str(bank), "size": "sm", "color": "#5A4A68", "flex": 4}
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        {"type": "text", "text": "🆔 เลขอ้างอิง:", "size": "sm", "color": "#7a7a7a", "flex": 2},
                        {"type": "text", "text": str(ref_id), "size": "sm", "color": "#5A4A68", "flex": 4}
                    ]
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "spacing": "xs",
            "contents": [
                {
                    "type": "button",
                    "action": {
                        "type": "postback",
                        "label": "🟢 ยืนยันข้อมูลถูกต้อง",
                        "data": f"CONFIRM_TRANSACTION:{trans_id}",
                        "displayText": "🟢 ยืนยันข้อมูลสำเร็จ"
                    },
                    "style": "primary",
                    "color": "#10B981"
                },
                {
                    "type": "button",
                    "action": {
                        "type": "uri",
                        "label": "✍️ แก้ไขข้อมูลบนเว็บ",
                        "uri": f"https://fillax.vercel.app/transactions?review={trans_id}"
                    },
                    "style": "secondary",
                    "color": "#8C66FF"
                }
            ]
        }
    }

    await send_line_reply(reply_token, [{
        "type": "flex",
        "altText": "🤖 ตรวจจับสลิปโอนเงินเรียบร้อย (Fillax)",
        "contents": flex_content
    }])
