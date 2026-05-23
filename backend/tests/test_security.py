"""
Unit and Integration Tests — Fillax Security-First Layer
Run using: pytest tests/test_security.py -v
"""

import pytest
import io
from fastapi import Request, HTTPException, UploadFile, status
from unittest.mock import Mock
from app.core.security import (
    sanitize_text,
    validate_uploaded_file,
    RateLimiter,
    mask_pii,
    scan_for_threats,
)

# ─── 1. INPUT SANITIZATION TESTS ──────────────────────────────────────────────
class TestInputSanitization:
    def test_sanitize_plain_text(self):
        """Plain text should remain unchanged but stripped."""
        assert sanitize_text("  hello world  ") == "hello world"

    def test_sanitize_neutralizes_xss_tags(self):
        """Script and HTML tags must be safely escaped."""
        raw_xss = "<script>alert('hack');</script>"
        safe_xss = sanitize_text(raw_xss)
        assert "<script>" not in safe_xss
        assert "&lt;script&gt;" in safe_xss

    def test_sanitize_removes_hidden_control_characters(self):
        """Hidden control characters should be silently removed."""
        text_with_control = "hello\x00world\x1f"
        assert sanitize_text(text_with_control) == "helloworld"


# ─── 2. FILE UPLOAD VALIDATION TESTS ──────────────────────────────────────────
class TestFileUploadValidation:
    @pytest.mark.asyncio
    async def test_validate_valid_pdf_upload(self):
        """Valid PDF format should pass file checks with no errors."""
        mock_file = UploadFile(
            filename="receipt.pdf",
            file=io.BytesIO(b"%PDF-1.4 mock content"),
            headers={"content-type": "application/pdf"}
        )
        # Should not raise any HTTPException
        await validate_uploaded_file(mock_file)

    @pytest.mark.asyncio
    async def test_validate_invalid_mime_type(self):
        """Executable or unsupported MIME-types must raise HTTP 415."""
        mock_file = UploadFile(
            filename="malicious.exe",
            file=io.BytesIO(b"executable content"),
            headers={"content-type": "application/x-msdownload"}
        )
        with pytest.raises(HTTPException) as exc_info:
            await validate_uploaded_file(mock_file)
        assert exc_info.value.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE

    @pytest.mark.asyncio
    async def test_validate_invalid_extension(self):
        """Even if content type is mock-passed, invalid extension must raise HTTP 400."""
        mock_file = UploadFile(
            filename="receipt.exe",
            file=io.BytesIO(b"content"),
            headers={"content-type": "application/pdf"}  # Spoofed MIME
        )
        with pytest.raises(HTTPException) as exc_info:
            await validate_uploaded_file(mock_file)
        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.asyncio
    async def test_validate_oversized_file(self):
        """Files exceeding the size cap (10MB) must raise HTTP 413."""
        # Mock file that returns a size exceeding 10MB
        oversized_data = b"a" * (10 * 1024 * 1024 + 10)
        mock_file = UploadFile(
            filename="huge_receipt.png",
            file=io.BytesIO(oversized_data),
            headers={"content-type": "image/png"}
        )
        with pytest.raises(HTTPException) as exc_info:
            await validate_uploaded_file(mock_file)
        assert exc_info.value.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE


# ─── 3. IP RATE LIMITER TESTS ──────────────────────────────────────────────────
class TestRateLimiter:
    @pytest.mark.asyncio
    async def test_rate_limiter_allows_requests_below_limit(self):
        """Limiter should permit requests within threshold."""
        limiter = RateLimiter(limit=3, window_seconds=10)
        mock_request = Mock(spec=Request)
        mock_request.client = Mock()
        mock_request.client.host = "192.168.1.50"
        
        # 3 requests should be permitted
        await limiter.check(mock_request, "test_action")
        await limiter.check(mock_request, "test_action")
        await limiter.check(mock_request, "test_action")

    @pytest.mark.asyncio
    async def test_rate_limiter_blocks_requests_over_limit(self):
        """Exceeding the threshold must immediately trigger HTTP 429."""
        limiter = RateLimiter(limit=2, window_seconds=10)
        mock_request = Mock(spec=Request)
        mock_request.client = Mock()
        mock_request.client.host = "192.168.1.60"
        
        # First 2 requests pass
        await limiter.check(mock_request, "abuse_action")
        await limiter.check(mock_request, "abuse_action")
        
        # 3rd request should trigger Too Many Requests error
        with pytest.raises(HTTPException) as exc_info:
            await limiter.check(mock_request, "abuse_action")
        assert exc_info.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS


# ─── 4. PII PRIVACY MASKING SHIELD TESTS ─────────────────────────────────────
class TestPIIMasking:
    def test_mask_thai_national_id(self):
        """Thai 13-digit National ID numbers must be fully masked."""
        raw_text = "เลขบัตรของฉันคือ 1-2345-67890-12-3"
        masked = mask_pii(raw_text)
        assert "1-2345-67890-12-3" not in masked
        assert "1-XXXX-XXXXX-12-3" in masked

        # Unformatted
        raw_unformatted = "บัตรเลข 5012345678901"
        assert mask_pii(raw_unformatted) == "บัตรเลข 5-XXXX-XXXXX-90-1"

    def test_mask_credit_card(self):
        """16-digit credit card numbers must be masked."""
        raw_text = "จ่ายเงินด้วยบัตร 4111-2222-3333-4444"
        masked = mask_pii(raw_text)
        assert "4111-2222-3333-4444" not in masked
        assert "4111-XXXX-XXXX-4444" in masked

    def test_mask_emails(self):
        """Email addresses should be anonymized."""
        raw_text = "ติดต่อฉันที่ business.owner@fillax.co.th"
        masked = mask_pii(raw_text)
        assert "business.owner" not in masked
        assert "bu***er@fillax.co.th" in masked

    def test_mask_phone_numbers(self):
        """Thai phone numbers must be masked."""
        raw_text = "เบอร์ร้านค้า 081-234-5678"
        masked = mask_pii(raw_text)
        assert "081-234-5678" not in masked
        assert "081-XXX-5678" in masked


# ─── 5. WAF & INTRUSION DETECTION SYSTEM TESTS ──────────────────────────────
class TestIntrusionDetection:
    def test_detects_and_blocks_sqli(self):
        """SQL Injection payloads must be blocked with HTTP 400."""
        sqli_payloads = [
            "SELECT * FROM users;",
            "1' OR '1'='1",
            "admin' --",
            "UNION SELECT username, password FROM accounts"
        ]
        for payload in sqli_payloads:
            with pytest.raises(HTTPException) as exc_info:
                scan_for_threats(payload, "192.168.1.99")
            assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_detects_and_blocks_xss(self):
        """Cross-Site Scripting payloads must be blocked with HTTP 400."""
        xss_payloads = [
            "<script>alert(1)</script>",
            "javascript:void(0)",
            "<img src=x onerror=alert(1)>"
        ]
        for payload in xss_payloads:
            with pytest.raises(HTTPException) as exc_info:
                scan_for_threats(payload, "192.168.1.99")
            assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_detects_and_blocks_path_traversal(self):
        """Path Traversal payloads must be blocked with HTTP 400."""
        traversal_payloads = [
            "../../etc/passwd",
            "..\\..\\windows\\system32",
            "c:/windows/system32"
        ]
        for payload in traversal_payloads:
            with pytest.raises(HTTPException) as exc_info:
                scan_for_threats(payload, "192.168.1.99")
            assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST

    def test_permits_safe_plain_text(self):
        """Standard safe user messages must pass with no errors."""
        safe_messages = [
            "สวัสดีครับ อยากถามวิธีคิดภาษีเงินได้บุคคลธรรมดาของมาตรา 40(1) ครับ",
            "ผมมีรายรับปีนี้ 500,000 บาทครับ หักค่าใช้จ่ายแบบเหมาได้ไหม",
            "กรุณาอธิบายเกณฑ์ภาษีมูลค่าเพิ่มสำหรับร้านค้าออนไลน์พาสเทลหน่อยครับ"
        ]
        for msg in safe_messages:
            # Should not raise any exception
            scan_for_threats(msg, "192.168.1.99")


# ─── 6. AUTO-SANITIZATION & WAF MIDDLEWARE INTEGRATION TESTS ──────────────────
from app.schemas.transaction import TransactionCreate
from fastapi.testclient import TestClient
from app.main import app

class TestAutoSanitizationAndWafMiddleware:
    def test_pydantic_schema_auto_sanitization(self):
        """String fields in Pydantic schemas must be automatically sanitized and XSS escaped."""
        raw_data = {
            "date": "2026-05-18",
            "name": "  <script>alert('xss')</script> Shop Sales ",
            "amount": 25000.0,
            "type": "income",
            "category": "ขายสินค้าออนไลน์",
            "channel": "shopee",
            "note": "<b>Urgent</b>"
        }
        transaction = TransactionCreate(**raw_data)
        # Check that leading/trailing spaces are stripped, HTML is escaped, and tags are neutralized
        assert transaction.name == "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt; Shop Sales"
        assert transaction.note == "&lt;b&gt;Urgent&lt;/b&gt;"

    def test_waf_middleware_blocks_sqli_in_post_payload(self):
        """Global security middleware must intercept and block SQL injection payloads in JSON post requests."""
        client = TestClient(app)
        # SQL Injection attempt inside post payload
        bad_payload = {
            "date": "2026-05-18",
            "name": "SELECT * FROM users;",
            "amount": 50.0,
            "type": "expense",
            "category": "other"
        }
        # Standard endpoints require JWT authentication, but the middleware intercepts BEFORE router authentication checks
        response = client.post("/api/v1/income/transactions", json=bad_payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Security Violation: Malicious payload detected." in response.json()["detail"]

    def test_waf_middleware_blocks_xss_in_query_params(self):
        """Global security middleware must intercept and block XSS script tags in query parameters."""
        client = TestClient(app)
        # XSS attempt inside query param
        response = client.get("/api/v1/income/transactions?channel=<script>evil()</script>")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Security Violation: Malicious payload detected." in response.json()["detail"]

    def test_waf_middleware_allows_safe_traffic(self):
        """Global security middleware must allow safe, standard traffic to pass through undisturbed."""
        client = TestClient(app)
        # A simple health check request should succeed
        response = client.get("/health")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "ok"

