from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from app.models.user import UserCreate, UserUpdate, UserInDB, User
from app.core.password_utils import get_password_hash

class UserService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.database = database
        self.collection = database.users

    async def create_user(self, user_data: UserCreate) -> UserInDB:
        # Check if user already exists
        existing_user = await self.collection.find_one({
            "$or": [
                {"email": user_data.email},
                {"username": user_data.username}
            ]
        })
        if existing_user:
            raise ValueError("User with this email or username already exists")
        
        # Create user document
        user_dict = user_data.dict(exclude={"password"})
        user_dict["hashed_password"] = get_password_hash(user_data.password)
        user_dict["created_at"] = datetime.utcnow()
        
        # Insert user
        result = await self.collection.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        
        return UserInDB(**user_dict)

    async def get_user_by_id(self, user_id: str) -> Optional[UserInDB]:
        if not ObjectId.is_valid(user_id):
            return None
        
        user_doc = await self.collection.find_one({"_id": ObjectId(user_id)})
        if user_doc:
            return UserInDB(**user_doc)
        return None

    async def get_user_by_email(self, email: str) -> Optional[UserInDB]:
        user_doc = await self.collection.find_one({"email": email})
        if user_doc:
            return UserInDB(**user_doc)
        return None

    async def get_user_by_username(self, username: str) -> Optional[UserInDB]:
        user_doc = await self.collection.find_one({"username": username})
        if user_doc:
            return UserInDB(**user_doc)
        return None

    async def get_user_by_google_id(self, google_id: str) -> Optional[UserInDB]:
        user_doc = await self.collection.find_one({"google_id": google_id})
        if user_doc:
            return UserInDB(**user_doc)
        return None

    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[UserInDB]:
        if not ObjectId.is_valid(user_id):
            return None
        
        update_data = {k: v for k, v in user_data.dict(exclude_unset=True).items()}
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            await self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
        
        return await self.get_user_by_id(user_id)

    async def delete_user(self, user_id: str) -> bool:
        if not ObjectId.is_valid(user_id):
            return False
        
        result = await self.collection.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0

    async def get_users(self, skip: int = 0, limit: int = 10) -> List[User]:
        cursor = self.collection.find().skip(skip).limit(limit)
        users = []
        async for user_doc in cursor:
            user_dict = user_doc.copy()
            user_dict.pop("hashed_password", None)  # Remove password from response
            users.append(User(**user_dict))
        return users

    async def create_google_user(self, google_user_data: dict) -> UserInDB:
        """Create user from Google OAuth data"""
        user_dict = {
            "email": google_user_data["email"],
            "username": google_user_data["email"].split("@")[0],  # Use email prefix as username
            "full_name": google_user_data.get("name", ""),
            "profile_picture": google_user_data.get("picture"),
            "google_id": google_user_data["sub"],
            "hashed_password": "",  # No password for Google users
            "is_active": True,
            "role": "user",
            "created_at": datetime.utcnow()
        }
        
        # Check if username already exists and modify if needed
        base_username = user_dict["username"]
        counter = 1
        while await self.get_user_by_username(user_dict["username"]):
            user_dict["username"] = f"{base_username}{counter}"
            counter += 1
        
        result = await self.collection.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        
        return UserInDB(**user_dict)

