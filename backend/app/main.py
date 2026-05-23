from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.endpoints import tax, income, auth, ai, receipts, payment, line
from app.core.config import settings
from app.core.security import scan_for_threats

app = FastAPI(
    title="TaxMate API",
    description="Backend สำหรับ TaxMate — ภาษีแม่ค้าออนไลน์ไทย",
    version="0.1.0",
)

# CORS — อนุญาต frontend เรียก API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Unified WAF Threat Scanner & Secure Headers Middleware — Defense-in-depth protection
@app.middleware("http")
async def secure_shield_middleware(request, call_next):
    # 1. Intrusion Detection System (WAF) - Scan query parameters
    client_ip = request.client.host if request.client else "unknown"
    for key, val in request.query_params.items():
        try:
            scan_for_threats(val, client_ip)
        except Exception as he:
            return JSONResponse(
                status_code=400,
                content={"detail": "Security Violation: Malicious payload detected."}
            )
            
    # 2. Intrusion Detection System (WAF) - Scan body if present
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body_bytes = await request.body()
            body_str = body_bytes.decode("utf-8", errors="ignore")
            if body_str:
                scan_for_threats(body_str, client_ip)
            
            # Reconstruct body stream so FastAPI routers can read it
            async def receive():
                return {"type": "http.request", "body": body_bytes, "more_body": False}
            request._receive = receive
        except Exception as he:
            # If it's an HTTPException raised by scan_for_threats, return 400
            if hasattr(he, "status_code") and he.status_code == 400:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Security Violation: Malicious payload detected."}
                )
            # Otherwise let standard parsing handle it or pass through
            pass

    # 3. Process the request
    response = await call_next(request)
    
    # 4. Inject Secure Defense-in-depth Response Headers
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    # Secure API Content Security Policy
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'; object-src 'none';"
    
    return response

# Routes
app.include_router(auth.router,     prefix="/api/v1/auth",     tags=["auth"])
app.include_router(tax.router,      prefix="/api/v1/tax",      tags=["tax"])
app.include_router(income.router,   prefix="/api/v1/income",   tags=["income"])
app.include_router(ai.router,       prefix="/api/v1/ai",       tags=["ai"])
app.include_router(receipts.router, prefix="/api/v1/receipts", tags=["receipts"])
app.include_router(payment.router,  prefix="/api/v1/payment",  tags=["payment"])
app.include_router(line.router,     prefix="/api/v1/line",     tags=["line"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "TaxMate API"}
