from fastapi import APIRouter, HTTPException
from models.auth_models import SignupRequest, LoginRequest
from services.supabase_client import supabase

router = APIRouter()

@router.post("/signup")
async def signup(user: SignupRequest):
    try:
        response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password
        })

        if response.user is None:
            raise HTTPException(status_code=400, detail="Signup failed. Please try again.")

        return {
            "message": "Signup successful. Please verify your email if required.",
            "user_id": response.user.id,
            "email": response.user.email
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        # Handle common Supabase auth errors
        if "already registered" in error_msg.lower() or "already been registered" in error_msg.lower():
            raise HTTPException(status_code=400, detail="This email is already registered. Please log in.")
        if "password" in error_msg.lower() and "short" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
        raise HTTPException(status_code=400, detail=f"Signup failed: {error_msg}")

@router.post("/login")
async def login(user: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })

        if response.session is None:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {
            "message": "Login successful",
            "access_token": response.session.access_token,
            "user_id": response.user.id,
            "email": response.user.email
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "invalid" in error_msg.lower() or "credentials" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(status_code=401, detail="Login failed. Please check your credentials.")