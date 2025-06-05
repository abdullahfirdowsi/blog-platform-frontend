from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from authlib.integrations.httpx_client import AsyncOAuth2Client
from datetime import timedelta
from typing import Optional
import httpx
from pydantic import BaseModel, EmailStr

from app.core.security import (
    create_access_token, 
    create_refresh_token,
    verify_password, 
    get_database,
    get_current_user,
    verify_token
)
from app.core.config import settings
from app.models.user import UserCreate, UserAuth, User
from app.services.user_service import UserService

router = APIRouter(tags=["authentication"], prefix="/auth")

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserAuth

class GoogleTokenRequest(BaseModel):
    token: str  # Google ID token

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Register a new user with email and password
    """
    user_service = UserService(db)
    
    try:
        # Create user
        user = await user_service.create_user(user_data)
        
        # Generate tokens
        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))
        
        # Set refresh token as HTTP-only cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax"
        )
        
        user_auth = UserAuth(
            id=str(user.id),
            email=user.email,
            username=user.username,
            role=user.role,
            is_active=user.is_active
        )
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user_auth
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=Token)
async def login_user(
    login_data: LoginRequest,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Login user with email and password
    """
    user_service = UserService(db)
    
    # Get user by email
    user = await user_service.get_user_by_email(login_data.email)
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Generate tokens
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    # Set refresh token as HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )
    
    user_auth = UserAuth(
        id=str(user.id),
        email=user.email,
        username=user.username,
        role=user.role,
        is_active=user.is_active
    )
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user_auth
    )

@router.post("/google", response_model=Token)
async def google_auth(
    google_token: GoogleTokenRequest,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Authenticate user with Google OAuth token
    """
    user_service = UserService(db)
    
    try:
        # Verify Google token
        async with httpx.AsyncClient() as client:
            google_response = await client.get(
                f"https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={google_token.token}"
            )
            
        if google_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token"
            )
        
        google_user_data = google_response.json()
        
        # Verify the token is for our app
        if google_user_data.get("aud") != settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token audience"
            )
        
        # Check if user exists by Google ID
        user = await user_service.get_user_by_google_id(google_user_data["sub"])
        
        if not user:
            # Check if user exists by email
            user = await user_service.get_user_by_email(google_user_data["email"])
            
            if user:
                # Link existing account with Google
                await user_service.update_user(
                    str(user.id),
                    {"google_id": google_user_data["sub"]}
                )
            else:
                # Create new user from Google data
                user = await user_service.create_google_user(google_user_data)
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # Generate tokens
        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))
        
        # Set refresh token as HTTP-only cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax"
        )
        
        user_auth = UserAuth(
            id=str(user.id),
            email=user.email,
            username=user.username,
            role=user.role,
            is_active=user.is_active
        )
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user_auth
        )
        
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error verifying Google token"
        )

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Refresh access token using refresh token from cookie
    """
    user_service = UserService(db)
    
    # Get refresh token from cookie
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )
    
    # Verify refresh token
    user_id = verify_token(refresh_token, "refresh")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Get user
    user = await user_service.get_user_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Generate new tokens
    access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_refresh_token(subject=str(user.id))
    
    # Set new refresh token as HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )
    
    user_auth = UserAuth(
        id=str(user.id),
        email=user.email,
        username=user.username,
        role=user.role,
        is_active=user.is_active
    )
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=user_auth
    )

@router.post("/logout")
async def logout_user(response: Response):
    """
    Logout user by clearing refresh token cookie
    """
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get current user information
    """
    user_service = UserService(db)
    user = await user_service.get_user_by_id(current_user.id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Convert to User model (without sensitive data)
    return User(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        role=user.role,
        profile_picture=user.profile_picture,
        bio=user.bio,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
