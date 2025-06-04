from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from pydantic import BaseModel

from app.core.security import (
    get_current_user, 
    get_current_admin_user,
    get_optional_current_user,
    get_database
)
from app.models.user import UserAuth
from app.models.post import PostCreate, PostUpdate, Post, PostSummary
from app.services.post_service import PostService

router = APIRouter(tags=["posts"], prefix="/posts")

class PostsResponse(BaseModel):
    posts: List[PostSummary]
    total: int
    page: int
    limit: int
    total_pages: int

@router.get("/", response_model=PostsResponse)
async def get_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query("published", pattern="^(draft|published|all)$", description="Filter by post status"),
    category: Optional[str] = None,
    tags: Optional[str] = Query(None, description="Comma-separated list of tags"),
    search: Optional[str] = None,
    author_id: Optional[str] = None,
    current_user: Optional[UserAuth] = Depends(get_optional_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get posts with pagination, filtering, and search
    
    - Public: Access to published posts only
    - Authenticated: Access to own drafts plus all published posts
    - Admin: Access to all posts (drafts and published)
    
    Use status=draft to see only draft posts (requires authentication)
    Use status=published to see only published posts
    Use status=all to see both (admin only for all users' posts)
    """
    post_service = PostService(db)
    
    # Parse tags if provided
    tags_list = None
    if tags:
        tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
    
    # Handle status filter - only show drafts to author or admin
    if status == "draft":
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view drafts"
            )
        if current_user.role != "admin" and author_id != current_user.id:
            author_id = current_user.id  # Only show user's own drafts
    
    if status == "all":
        status = None
    
    # Calculate pagination
    skip = (page - 1) * limit
    
    # Get posts
    posts = await post_service.get_posts(
        skip=skip,
        limit=limit,
        status=status,
        category=category,
        tags=tags_list,
        search=search,
        author_id=author_id,
        current_user_id=current_user.id if current_user else None
    )
    
    # Get total count for pagination
    total = await post_service.get_posts_count(
        status=status,
        category=category,
        tags=tags_list,
        search=search,
        author_id=author_id
    )
    
    total_pages = (total + limit - 1) // limit
    
    return PostsResponse(
        posts=posts,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@router.get("/{post_id}", response_model=Post)
async def get_post(
    post_id: str,
    current_user: Optional[UserAuth] = Depends(get_optional_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get a specific post by ID
    
    - Public: Access to published posts only
    - Authenticated: Access to own drafts plus all published posts
    - Admin: Access to all posts (drafts and published)
    """
    post_service = PostService(db)
    
    post = await post_service.get_post_by_id(
        post_id, 
        current_user.id if current_user else None
    )
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if user can view draft posts
    if post.status == "draft":
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot view draft posts without authentication"
            )
        if current_user.role != "admin" and post.author_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot view other users' draft posts"
            )
    
    # Increment view count for published posts
    if post.status == "published":
        await post_service.increment_views(post_id)
    
    return post

@router.post("/", response_model=Post, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a new post
    
    - Authentication required
    - Users can create posts with status "draft" or "published"
    - Set status="draft" to save as draft (visible only to the author or admins)
    """
    post_service = PostService(db)
    
    try:
        post = await post_service.create_post(post_data, current_user.id)
        
        # Return the created post with author info
        return await post_service.get_post_by_id(str(post.id), current_user.id)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{post_id}", response_model=Post)
async def update_post(
    post_id: str,
    post_data: PostUpdate,
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update a post
    
    - Authentication required
    - Users can only update their own posts
    - Admins can update any post
    - Can change status between "draft" and "published"
    """
    post_service = PostService(db)
    
    # Check if post exists
    existing_post = await post_service.get_post_by_id(post_id)
    if not existing_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and existing_post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this post"
        )
    
    # Use the updated post_service method that handles roles
    updated_post = await post_service.update_post(
        post_id, 
        post_data, 
        user_id=current_user.id, 
        user_role=current_user.role
    )
    
    if not updated_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or no changes made"
        )
    
    # Return the updated post with author info
    return await post_service.get_post_by_id(post_id, current_user.id)

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Delete a post
    
    - Authentication required
    - Users can only delete their own posts
    - Admins can delete any post
    """
    post_service = PostService(db)
    
    success = await post_service.delete_post(post_id, current_user.id, current_user.role)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or no permission to delete"
        )

@router.post("/{post_id}/like", status_code=status.HTTP_200_OK)
async def like_post(
    post_id: str,
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Like a post
    """
    post_service = PostService(db)
    
    success = await post_service.like_post(post_id, current_user.id)
    
    if not success:
        return {"message": "Post already liked or not found"}
    
    return {"message": "Post liked successfully"}

@router.delete("/{post_id}/like", status_code=status.HTTP_200_OK)
async def unlike_post(
    post_id: str,
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Unlike a post
    """
    post_service = PostService(db)
    
    success = await post_service.unlike_post(post_id, current_user.id)
    
    if not success:
        return {"message": "Post not liked or not found"}
    
    return {"message": "Post unliked successfully"}

@router.get("/categories/", response_model=List[str])
async def get_categories(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all available categories
    
    - Public access
    - Returns categories used in published posts only
    """
    post_service = PostService(db)
    
    # Get distinct categories from published posts
    categories = await post_service.collection.distinct(
        "category", 
        {"status": "published", "category": {"$ne": None}}
    )
    
    return sorted([cat for cat in categories if cat])

@router.get("/tags/", response_model=List[str])
async def get_tags(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all available tags
    
    - Public access
    - Returns tags used in published posts only
    """
    post_service = PostService(db)
    
    # Aggregate to get all unique tags from published posts
    pipeline = [
        {"$match": {"status": "published", "tags": {"$exists": True, "$ne": []}}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags"}},
        {"$sort": {"_id": 1}}
    ]
    
    cursor = post_service.collection.aggregate(pipeline)
    tags = [doc["_id"] async for doc in cursor]
    
    return tags
