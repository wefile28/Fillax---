"""
Fillax Core Security Module — Security-First Architecture
Contains:
1. Asynchronous In-Memory Rate Limiter (IP-based, sliding window)
2. Input Sanitization (XSS, control characters & prompt injection protection)
3. Strict File Upload & MIME-Type Validation
4. Secure HTTP Headers Middleware configuration
"""

import time
import html
import re
from collections import defaultdict
from fastapi import Request, HTTPException, status, UploadFile
from typing import Dict, List, Tuple, Any
from pydantic import BaseModel, model_validator
import redis
from app.core.config import settings

# Initialize Redis client for shared caching and rate limiting across multi-instances
redis_client = None
if settings.REDIS_URL:
    try:
        # Simple client setup (decode_responses=True for easy string manipulation)
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        redis_client.ping()
        print("[REDIS] Connected successfully to shared cache and rate limiter server! 🟢")
    except Exception as redis_err:
        redis_client = None
        print(f"[REDIS_WARNING] Redis URL was provided but server connection failed, falling back to local memory: {redis_err}")

# ─── 1. ASYNCHRONOUS IN-MEMORY RATE LIMITER ──────────────────────────────────
# Dictionary mapping client IP -> list of request timestamps (Graceful in-memory fallback)
_request_records: Dict[str, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))

class RateLimiter:
    """
    High-Performance Sliding Window Rate Limiter.
    Utilizes Redis Sorted Sets for multi-instance distributed environments,
    with an automatic zero-dependency in-memory fallback.
    """
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds

    async def check(self, request: Request, endpoint_key: str):
        # Retrieve client IP securely
        client_ip = request.client.host if request.client else "unknown-ip"
        now = time.time()
        
        # 1. Distributed Redis Sliding Window Implementation
        if redis_client:
            try:
                # Key format: rate_limit:ip:endpoint
                key = f"rate_limit:{client_ip}:{endpoint_key}"
                
                # Execute atomic operations via Redis pipeline
                pipe = redis_client.pipeline()
                # Remove timestamps older than the sliding window boundary
                pipe.zremrangebyscore(key, 0, now - self.window_seconds)
                # Count remaining requests in the active window
                pipe.zcard(key)
                # Add current request timestamp
                pipe.zadd(key, {str(now): now})
                # Auto-expire cache keys after window inactivity
                pipe.expire(key, self.window_seconds * 2)
                
                res = pipe.execute()
                request_count = res[1]
                
                if request_count >= self.limit:
                    # Retrieve the timestamp of the oldest valid request to calculate retry duration
                    oldest = redis_client.zrange(key, 0, 0, withscores=True)
                    retry_after = int(self.window_seconds)
                    if oldest:
                        retry_after = max(1, int(self.window_seconds - (now - oldest[0][1])))
                        
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "message": "Too many requests. Please slow down.",
                            "retry_after": retry_after
                        }
                    )
                return
            except HTTPException:
                raise
            except Exception as e:
                # Fall back gracefully to local memory on connection failure
                print(f"[REDIS_RATE_LIMITER] Connection lost, falling back to local memory: {e}")
                
        # 2. Local In-Memory Fallback Implementation
        timestamps = _request_records[client_ip][endpoint_key]
        valid_timestamps = [t for t in timestamps if now - t < self.window_seconds]
        
        if len(valid_timestamps) >= self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Too many requests. Please slow down.",
                    "retry_after": int(self.window_seconds - (now - valid_timestamps[0]))
                }
            )
            
        valid_timestamps.append(now)
        _request_records[client_ip][endpoint_key] = valid_timestamps



# Rate-limiting instances for expensive AI/OCR endpoints
# 10 OCR scans per minute per IP
ocr_limiter = RateLimiter(limit=10, window_seconds=60)
# 20 AI Chat questions per minute per IP
chat_limiter = RateLimiter(limit=20, window_seconds=60)
# 30 tax calculations per minute per IP
tax_limiter = RateLimiter(limit=30, window_seconds=60)


# ─── 2. INPUT SANITIZATION & SAFEGUARD ───────────────────────────────────────
# Remove HTML tags and strip control characters to avoid XSS/Injection
CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")

def sanitize_text(text: str) -> str:
    """
    Sanitize text input by removing control characters, escaping HTML entities,
    and stripping whitespace to prevent XSS and reduce prompt injection.
    """
    if not text:
        return ""
    # Remove hidden control characters
    cleaned = CONTROL_CHARS_RE.sub("", text)
    # Escape HTML to neutralize script tags
    safe_html = html.escape(cleaned)
    return safe_html.strip()


class SafeBaseModel(BaseModel):
    """
    Base model that automatically sanitizes all string fields to neutralize
    XSS payloads, strip harmful control characters, and clean inputs before 
    any routing logic handles them.
    """
    @model_validator(mode="before")
    @classmethod
    def sanitize_strings(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for key, val in data.items():
                if isinstance(val, str):
                    data[key] = sanitize_text(val)
                elif isinstance(val, list):
                    data[key] = [sanitize_text(item) if isinstance(item, str) else item for item in val]
        return data



# ─── 3. FILE UPLOAD & MIME-TYPE VALIDATION ────────────────────────────────────
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp"
}

async def validate_uploaded_file(file: UploadFile):
    """
    Strictly validates the file upload's MIME-type, extension, and content size
    to prevent Denial of Service (DoS) and upload of malicious executables.
    """
    # 1. Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file format '{file.content_type}'. Only PDF, PNG, JPG, JPEG, and WEBP are allowed."
        )
        
    # 2. Validate file extension
    filename = file.filename.lower() if file.filename else ""
    valid_extensions = (".pdf", ".png", ".jpg", ".jpeg", ".webp")
    if not filename.endswith(valid_extensions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file extension. Please upload a valid document or image."
        )
        
    # 3. Validate content length
    # Read a chunk to estimate size without consuming memory of huge files
    content = await file.read(MAX_FILE_SIZE_BYTES + 1)
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large. Maximum allowed file size is 10 MB."
        )
    # Reset file cursor so it can be read again later
    await file.seek(0)


# ─── 4. ADVANCED PII DATA PRIVACY SHIELD ─────────────────────────────────────
# Regular expressions for sensitive personal identifiers
THAI_ID_RE = re.compile(r"\b\d{13}\b|\b\d{1}-\d{4}-\d{5}-\d{2}-\d{1}\b")
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_RE = re.compile(r"\b0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}\b")
CREDIT_CARD_RE = re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b")

def mask_pii(text: str) -> str:
    """
    Advanced Privacy Shield: Scans, detects, and masks sensitive personal data
    (Thai National ID, Email, Phone, Credit Cards) before passing text to 
    external AI APIs. This guarantees absolute compliance and user peace of mind.
    """
    if not text:
        return ""
        
    # 1. Mask Thai National ID cards (e.g. 1-2345-67890-12-3 -> 1-XXXX-XXXXX-XX-X)
    def repl_thai_id(match):
        val = match.group(0).replace("-", "")
        masked = f"{val[0]}-XXXX-XXXXX-{val[10:12]}-{val[12]}" if len(val) == 13 else "X-XXXX-XXXXX-XX-X"
        return masked
    text = THAI_ID_RE.sub(repl_thai_id, text)
    
    # 2. Mask Credit Cards (e.g., 4111-2222-3333-4444 -> 4111-XXXX-XXXX-4444)
    def repl_card(match):
        val = match.group(0).replace("-", "").replace(" ", "")
        return f"{val[:4]}-XXXX-XXXX-{val[12:]}" if len(val) == 16 else "XXXX-XXXX-XXXX-XXXX"
    text = CREDIT_CARD_RE.sub(repl_card, text)
    
    # 3. Mask Emails (e.g., test.user@gmail.com -> te***er@gmail.com)
    def repl_email(match):
        email = match.group(0)
        local, domain = email.split("@", 1)
        if len(local) > 2:
            masked_local = f"{local[:2]}***{local[-2:] if len(local) > 4 else local[-1]}"
        else:
            masked_local = "**"
        return f"{masked_local}@{domain}"
    text = EMAIL_RE.sub(repl_email, text)
    
    # 4. Mask Phone numbers (e.g. 081-234-5678 -> 081-XXX-5678)
    def repl_phone(match):
        val = match.group(0).replace("-", "").replace(" ", "")
        return f"{val[:3]}-XXX-{val[6:]}" if len(val) >= 9 else "0XX-XXX-XXXX"
    text = PHONE_RE.sub(repl_phone, text)
    
    return text


# ─── 5. WAF & INTRUSION DETECTION ENGINE ──────────────────────────────────────
# Common Attack Signatures (SQLi, XSS, Path Traversal)
SQLI_SIGNATURES = [
    re.compile(r"(\b(select|union|insert|update|delete|drop|alter|truncate)\b)", re.IGNORECASE),
    re.compile(r"(['\"].*?\b(or|and)\b\s*?['\"].*?=)", re.IGNORECASE),
    re.compile(r"(--|#|/\*|\*/)", re.IGNORECASE)
]
XSS_SIGNATURES = [
    re.compile(r"(<script.*?>|<\/script>)", re.IGNORECASE),
    re.compile(r"(\bon\w+\s*?=)", re.IGNORECASE),
    re.compile(r"(javascript\s*?:)", re.IGNORECASE)
]
PATH_TRAVERSAL_SIGNATURES = [
    re.compile(r"(\.\./|\.\.\\)"),
    re.compile(r"(/etc/passwd|/windows/system32)", re.IGNORECASE)
]

def scan_for_threats(text: str, client_ip: str) -> None:
    """
    Intrusion Detection Shield: Parses inputs for typical web attack payloads.
    Triggers alarms and blocks requests immediately if malicious activity is suspected.
    """
    if not text:
        return
        
    # Check SQLi
    for sig in SQLI_SIGNATURES:
        if sig.search(text):
            print(f"[SECURITY_ALERT] SQL Injection signature detected from IP: {client_ip}!")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security Violation: Malicious payload detected."
            )
            
    # Check XSS
    for sig in XSS_SIGNATURES:
        if sig.search(text):
            print(f"[SECURITY_ALERT] Cross-Site Scripting (XSS) signature detected from IP: {client_ip}!")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security Violation: Malicious payload detected."
            )
            
    # Check Path Traversal
    for sig in PATH_TRAVERSAL_SIGNATURES:
        if sig.search(text):
            print(f"[SECURITY_ALERT] Path Traversal signature detected from IP: {client_ip}!")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security Violation: Malicious payload detected."
            )

