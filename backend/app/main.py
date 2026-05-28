from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.endpoints import line
from app.core.config import settings

app = FastAPI(
    title="Fillax API",
    description="Backend API for Fillax — The Solo Dev Tax Assistant",
    version="1.0.0",
)

# Configure CORS — Allows Next.js frontend calls securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def secure_headers_middleware(request, call_next):
    """
    Elite security response headers middleware.
    Protects user browser and sessions from XSS, Clickjacking, and Sniffing.
    """
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'; object-src 'none';"
    return response

# Register LINE Webhook Router under v1
app.include_router(line.router, prefix="/api/v1/line", tags=["line"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Fillax API"}
