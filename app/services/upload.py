import os
import logging
from typing import Optional, Dict, Any, Tuple
import cloudinary
import cloudinary.uploader
import cloudinary.api
from fastapi import UploadFile, HTTPException
import uuid

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Cloudinary configuration
def init_cloudinary():
    """Initialize Cloudinary with credentials from environment variables"""
    try:
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True
        )
        logger.info("Cloudinary initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Cloudinary: {str(e)}")
        raise HTTPException(status_code=500, detail="File upload service configuration error")

# Initialize on module import
init_cloudinary()

async def upload_profile_picture(file: UploadFile, user_id: str) -> Dict[str, Any]:
    """
    Upload a user profile picture to Cloudinary
    
    Args:
        file: The image file to upload
        user_id: The ID of the user
        
    Returns:
        Dict containing the upload result with the secure URL
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")
    
    try:
        # Read file content
        contents = await file.read()
        
        # Generate a unique filename
        filename = f"{user_id}_{uuid.uuid4()}"
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            contents,
            public_id=filename,
            folder="blog_platform/profile_pictures",
            overwrite=True,
            resource_type="image",
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face"},
                {"quality": "auto", "fetch_format": "auto"}
            ]
        )
        
        logger.info(f"Profile picture uploaded successfully for user {user_id}")
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "width": result["width"],
            "height": result["height"],
            "format": result["format"]
        }
    except Exception as e:
        logger.error(f"Failed to upload profile picture: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
    finally:
        # Reset file pointer
        await file.seek(0)

async def upload_cover_image(file: UploadFile, post_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Upload a blog post cover image to Cloudinary
    
    Args:
        file: The image file to upload
        post_id: Optional ID of the post (for updates)
        
    Returns:
        Dict containing the upload result with the secure URL
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")
    
    try:
        # Read file content
        contents = await file.read()
        
        # Generate a unique filename
        filename = f"post_{post_id if post_id else uuid.uuid4()}"
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            contents,
            public_id=filename,
            folder="blog_platform/cover_images",
            overwrite=True,
            resource_type="image",
            transformation=[
                {"width": 1200, "height": 630, "crop": "fill", "gravity": "auto"},
                {"quality": "auto", "fetch_format": "auto"}
            ]
        )
        
        logger.info(f"Cover image uploaded successfully for post {post_id or 'new'}")
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "width": result["width"],
            "height": result["height"],
            "format": result["format"]
        }
    except Exception as e:
        logger.error(f"Failed to upload cover image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
    finally:
        # Reset file pointer
        await file.seek(0)

async def delete_image(public_id: str) -> bool:
    """
    Delete an image from Cloudinary
    
    Args:
        public_id: The public ID of the image to delete
        
    Returns:
        bool: True if deletion was successful
    """
    try:
        result = cloudinary.uploader.destroy(public_id)
        if result.get("result") == "ok":
            logger.info(f"Image {public_id} deleted successfully")
            return True
        else:
            logger.warning(f"Failed to delete image {public_id}: {result}")
            return False
    except Exception as e:
        logger.error(f"Error deleting image {public_id}: {str(e)}")
        return False

