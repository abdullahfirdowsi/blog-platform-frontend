from datetime import datetime, timedelta
from typing import Any, Optional, Union
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.models.user import UserAuth, UserInDB
from app.services.user_service import UserService
from app.core.password_utils import verify_password, get_password_hash

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any]) -> str:
    """
    Create a JWT refresh token
    """
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    """
    Verify and decode JWT token
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type_claim: str = payload.get("type")
        
        if user_id is None or token_type_claim != token_type:
            return None
        return user_id
    except JWTError:
        return None

def get_database(request: Request) -> AsyncIOMotorDatabase:
    """
    Get database instance from request
    """
    return request.app.mongodb

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> UserAuth:
    """
    Get current authenticated user from JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    user_id = verify_token(token, "access")
    if user_id is None:
        raise credentials_exception
    
    user_service = UserService(db)
    user = await user_service.get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return UserAuth(
        id=str(user.id),
        email=user.email,
        username=user.username,
        role=user.role,
        is_active=user.is_active
    )

async def get_current_active_user(current_user: UserAuth = Depends(get_current_user)) -> UserAuth:
    """
    Get current active user
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

async def get_current_admin_user(current_user: UserAuth = Depends(get_current_user)) -> UserAuth:
    """
    Get current admin user
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Optional[UserAuth]:
    """
    Get current user if token is provided, otherwise return None
    Used for endpoints that work for both authenticated and unauthenticated users
    """
    if not token:
        return None
    
    try:
        user_id = verify_token(token, "access")
        if user_id is None:
            return None
        
        user_service = UserService(db)
        user = await user_service.get_user_by_id(user_id)
        if user is None or not user.is_active:
            return None
        
        return UserAuth(
            id=str(user.id),
            email=user.email,
            username=user.username,
            role=user.role,
            is_active=user.is_active
        )
    except Exception:
        return None

