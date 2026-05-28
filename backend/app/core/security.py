import re
import html

def sanitize_text(text: str) -> str:
    """
    Safely escape HTML and filter out dangerous control characters to prevent XSS.
    """
    if not text:
        return ""
    # Strip ASCII control characters (0-31, 127) except tab, newline, carriage return
    text = "".join(ch for ch in text if ord(ch) >= 32 or ch in "\t\n\r")
    return html.escape(text)

def mask_pii(text: str) -> str:
    """
    Automatically search for and mask Thai PII data (National ID, phone number, credit card, email)
    to protect user privacy before forwarding text to third-party LLMs.
    """
    if not text:
        return ""
    
    # 1. Thai National ID (13 digits: e.g. 1-2345-67890-12-3 or 1234567890123)
    id_pattern = re.compile(r'\b\d-?\d{4}-?\d{5}-?\d{2}-?\d\b')
    text = id_pattern.sub("[MASKED_NATIONAL_ID]", text)
    
    # 2. Credit Cards (16 digits: e.g. 1234-5678-9012-3456 or 1234567890123456)
    cc_pattern = re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b')
    text = cc_pattern.sub("[MASKED_CREDIT_CARD]", text)
    
    # 3. Emails
    email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    text = email_pattern.sub("[MASKED_EMAIL]", text)
    
    # 4. Thai Phone Numbers (e.g. 081-234-5678, 02-123-4567, 0812345678)
    phone_pattern = re.compile(r'\b0[2689]\d[-.\s]?\d{3}[-.\s]?\d{4}\b|\b02[-.\s]?\d{3}[-.\s]?\d{4}\b')
    text = phone_pattern.sub("[MASKED_PHONE]", text)
    
    return text
