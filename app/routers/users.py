from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from pydantic import BaseModel

from app.core.security import (
    get_current_user, 
    get_current_admin_user,
    get_database
)
from app.models.user import UserAuth, UserUpdate, User
from app.services.user_service import UserService
from app.services.post_service import PostService
from app.models.post import PostSummary

router = APIRouter(tags=["users"], prefix="/users")

class UserProfile(BaseModel):
    user: User
    posts_count: int
    published_posts_count: int
    draft_posts_count: int

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get current user's profile with post statistics
    """
    user_service = UserService(db)
    post_service = PostService(db)
    
    user = await user_service.get_user_by_id(current_user.id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get post counts
    total_posts = await post_service.get_posts_count(author_id=current_user.id)
    published_posts = await post_service.get_posts_count(
        author_id=current_user.id, 
        status="published"
    )
    draft_posts = await post_service.get_posts_count(
        author_id=current_user.id, 
        status="draft"
    )
    
    user_data = User(
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
    
    return UserProfile(
        user=user_data,
        posts_count=total_posts,
        published_posts_count=published_posts,
        draft_posts_count=draft_posts
    )

@router.get("/me/posts", response_model=List[PostSummary])
async def get_current_user_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query("all", pattern="^(draft|published|all)$"),
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get current user's posts
    """
    post_service = PostService(db)
    
    skip = (page - 1) * limit
    
    if status == "all":
        status = None
    
    posts = await post_service.get_posts(
        skip=skip,
        limit=limit,
        status=status,
        author_id=current_user.id,
        current_user_id=current_user.id
    )
    
    return posts

@router.get("/{user_id}", response_model=UserProfile)
async def get_user_profile(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get user profile by ID (public info only)
    """
    user_service = UserService(db)
    post_service = PostService(db)
    
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Only show published posts for public profiles
    published_posts = await post_service.get_posts_count(
        author_id=user_id, 
        status="published"
    )
    
    user_data = User(
        id=user.id,
        email="",  # Hide email from public
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        role="user",  # Hide role from public
        profile_picture=user.profile_picture,
        bio=user.bio,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
    
    return UserProfile(
        user=user_data,
        posts_count=published_posts,
        published_posts_count=published_posts,
        draft_posts_count=0
    )

@router.get("/{user_id}/posts", response_model=List[PostSummary])
async def get_user_posts(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get posts by a specific user (only published posts)
    """
    post_service = PostService(db)
    
    skip = (page - 1) * limit
    
    posts = await post_service.get_posts(
        skip=skip,
        limit=limit,
        status="published",
        author_id=user_id
    )
    
    return posts

@router.put("/me", response_model=User)
async def update_current_user(
    user_data: UserUpdate,
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update current user's profile
    """
    user_service = UserService(db)
    
    try:
        updated_user = await user_service.update_user(current_user.id, user_data)
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return User(
            id=updated_user.id,
            email=updated_user.email,
            username=updated_user.username,
            full_name=updated_user.full_name,
            is_active=updated_user.is_active,
            role=updated_user.role,
            profile_picture=updated_user.profile_picture,
            bio=updated_user.bio,
            created_at=updated_user.created_at,
            updated_at=updated_user.updated_at
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

