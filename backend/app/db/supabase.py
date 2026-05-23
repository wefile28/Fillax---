from supabase import create_client, Client
from app.core.config import settings
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Initialize Supabase client
# Service key allows bypassing Row Level Security (RLS) when necessary,
# but we will rely on Supabase's built-in RLS policies by setting headers
# or executing queries appropriately.
try:
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
except Exception as e:
    # Safe fallback for testing/initialization if env variables are empty placeholders
    supabase = None
    print(f"Warning: Supabase client initialization failed: {e}")

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to authenticate users using Supabase JWT tokens.
    Extracts the bearer token, validates it, and returns user details.
    """
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable.",
        )
    
    token = credentials.credentials
    try:
        # Validate the token using Supabase Auth
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token",
            )
        return res.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )
