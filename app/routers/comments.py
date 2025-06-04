from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional

from app.core.security import (
    get_current_user, 
    get_current_admin_user,
    get_database
)
from app.models.user import UserAuth
from app.models.comment import CommentCreate, CommentUpdate, Comment
from app.services.comment_service import CommentService

router = APIRouter(tags=["comments"], prefix="/comments")

@router.get("/post/{post_id}", response_model=List[Comment])
async def get_comments_by_post(
    post_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    include_replies: bool = Query(True),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get comments for a specific post
    """
    comment_service = CommentService(db)
    
    comments = await comment_service.get_comments_by_post(
        post_id=post_id,
        skip=skip,
        limit=limit,
        include_replies=include_replies
    )
    
    return comments

@router.get("/{comment_id}", response_model=Comment)
async def get_comment(
    comment_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get a specific comment by ID
    """
    comment_service = CommentService(db)
    
    comment = await comment_service.get_comment_by_id(comment_id)
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    return comment

@router.post("/", response_model=Comment, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a new comment
    """
    comment_service = CommentService(db)
    
    try:
        comment = await comment_service.create_comment(comment_data, current_user.id)
        
        # Return the created comment with author info
        return await comment_service.get_comment_by_id(str(comment.id))
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{comment_id}", response_model=Comment)
async def update_comment(
    comment_id: str,
    comment_data: CommentUpdate,
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update a comment (only by author or admin)
    """
    comment_service = CommentService(db)
    
    # Check if comment exists and user has permission
    existing_comment = await comment_service.get_comment_by_id(comment_id)
    if not existing_comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and existing_comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this comment"
        )
    
    updated_comment = await comment_service.update_comment(comment_id, comment_data, current_user.id)
    
    if not updated_comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or no changes made"
        )
    
    # Return the updated comment with author info
    return await comment_service.get_comment_by_id(comment_id)

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    current_user: UserAuth = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Delete a comment (only by author or admin)
    This will also delete all nested replies
    """
    comment_service = CommentService(db)
    
    # Check if comment exists and user has permission
    existing_comment = await comment_service.get_comment_by_id(comment_id)
    if not existing_comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and existing_comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this comment"
        )
    
    success = await comment_service.delete_comment(comment_id, current_user.id, current_user.role)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found or no permission to delete"
        )

@router.get("/post/{post_id}/count")
async def get_comments_count(
    post_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get the total number of comments for a post
    """
    comment_service = CommentService(db)
    
    count = await comment_service.get_comments_count(post_id)
    
    return {"count": count}
