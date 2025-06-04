from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import get_password_hash
from datetime import datetime
from bson import ObjectId

async def init_db(db: AsyncIOMotorClient) -> None:
    """Initialize database with indexes and default admin user if needed"""
    
    # Create indexes for users collection
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username")
    
    # Create indexes for posts collection
    await db.posts.create_index("author_id")
    await db.posts.create_index("category")
    await db.posts.create_index("tags")
    await db.posts.create_index("created_at")
    
    # Create indexes for comments collection
    await db.comments.create_index("post_id")
    await db.comments.create_index("author_id")
    await db.comments.create_index("created_at")
    
    # Check if admin user exists, if not create one
    admin_user = await db.users.find_one({"email": "admin@example.com"})
    if not admin_user:
        admin_user = {
            "email": "admin@example.com",
            "username": "admin",
            "hashed_password": get_password_hash("admin123"),  # Change this in production
            "is_active": True,
            "is_admin": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.users.insert_one(admin_user)

