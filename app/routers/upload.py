from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional

from ..core.auth import get_current_user
from ..models.user import User
from ..services.upload import upload_profile_picture, upload_cover_image, delete_image

router = APIRouter(
    prefix="/api/upload",
    tags=["upload"],
    responses={404: {"description": "Not found"}},
)

@router.post("/profile-picture", response_model=Dict[str, Any])
async def upload_profile_pic(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a profile picture for the current user
    
    Args:
        file: The image file to upload
        current_user: The authenticated user
        
    Returns:
        Dict containing the upload result with the secure URL
    """
    try:
        # Upload to Cloudinary
        result = await upload_profile_picture(file, str(current_user.id))
        
        return {
            "status": "success",
            "message": "Profile picture uploaded successfully",
            "data": result
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload profile picture: {str(e)}"
        )

@router.post("/cover-image", response_model=Dict[str, Any])
async def upload_post_cover_image(
    file: UploadFile = File(...),
    post_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Upload a cover image for a blog post
    
    Args:
        file: The image file to upload
        post_id: Optional ID of the post (for updates)
        current_user: The authenticated user
        
    Returns:
        Dict containing the upload result with the secure URL
    """
    try:
        # Upload to Cloudinary
        result = await upload_cover_image(file, post_id)
        
        return {
            "status": "success",
            "message": "Cover image uploaded successfully",
            "data": result
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload cover image: {str(e)}"
        )

@router.delete("/image", response_model=Dict[str, Any])
async def remove_image(
    public_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete an image from Cloudinary
    
    Args:
        public_id: The public ID of the image to delete
        current_user: The authenticated user
        
    Returns:
        Dict containing the result status
    """
    try:
        # Delete from Cloudinary
        result = await delete_image(public_id)
        
        if result:
            return {
                "status": "success",
                "message": "Image deleted successfully"
            }
        else:
            return {
                "status": "error",
                "message": "Failed to delete image"
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete image: {str(e)}"
        )

