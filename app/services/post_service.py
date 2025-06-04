from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime
from app.models.post import PostCreate, PostUpdate, PostInDB, Post, PostSummary

class PostService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.database = database
        self.collection = database.posts
        self.users_collection = database.users

    async def create_post(self, post_data: PostCreate, author_id: str) -> PostInDB:
        if not ObjectId.is_valid(author_id):
            raise ValueError("Invalid author ID")
        
        post_dict = post_data.dict()
        post_dict["author_id"] = ObjectId(author_id)
        post_dict["created_at"] = datetime.utcnow()
        
        result = await self.collection.insert_one(post_dict)
        post_dict["_id"] = result.inserted_id
        
        return PostInDB(**post_dict)

    async def get_post_by_id(self, post_id: str, current_user_id: Optional[str] = None) -> Optional[Post]:
        if not ObjectId.is_valid(post_id):
            return None
        
        # Aggregate to join with user data
        pipeline = [
            {"$match": {"_id": ObjectId(post_id)}},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "author_id",
                    "foreignField": "_id",
                    "as": "author"
                }
            },
            {"$unwind": "$author"},
            {
                "$addFields": {
                    "author_username": "$author.username",
                    "author_full_name": "$author.full_name",
                    "is_liked": {
                        "$cond": {
                            "if": {"$and": [
                                {"$ne": [current_user_id, None]},
                                {"$in": [ObjectId(current_user_id) if current_user_id and ObjectId.is_valid(current_user_id) else None, "$liked_by"]}
                            ]},
                            "then": True,
                            "else": False
                        }
                    }
                }
            },
            {
                "$project": {
                    "author": 0,  # Remove the author object
                    "liked_by": 0  # Remove liked_by array for privacy
                }
            }
        ]
        
        cursor = self.collection.aggregate(pipeline)
        post_doc = await cursor.to_list(length=1)
        
        if post_doc:
            post_dict = post_doc[0]
            post_dict["author_id"] = str(post_dict["author_id"])
            return Post(**post_dict)
        return None

    async def get_posts(
        self, 
        skip: int = 0, 
        limit: int = 10, 
        status: Optional[str] = "published",
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        search: Optional[str] = None,
        author_id: Optional[str] = None,
        current_user_id: Optional[str] = None
    ) -> List[PostSummary]:
        
        # Build match conditions
        match_conditions = {}
        
        if status:
            match_conditions["status"] = status
            
        if category:
            match_conditions["category"] = category
            
        if tags:
            match_conditions["tags"] = {"$in": tags}
            
        if author_id and ObjectId.is_valid(author_id):
            match_conditions["author_id"] = ObjectId(author_id)
            
        if search:
            match_conditions["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"content": {"$regex": search, "$options": "i"}},
                {"excerpt": {"$regex": search, "$options": "i"}}
            ]
        
        pipeline = [
            {"$match": match_conditions},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "author_id",
                    "foreignField": "_id",
                    "as": "author"
                }
            },
            {"$unwind": "$author"},
            {
                "$addFields": {
                    "author_username": "$author.username",
                    "author_full_name": "$author.full_name"
                }
            },
            {
                "$project": {
                    "title": 1,
                    "excerpt": 1,
                    "cover_image": 1,
                    "author_username": 1,
                    "author_full_name": 1,
                    "created_at": 1,
                    "likes_count": 1,
                    "comments_count": 1,
                    "tags": 1,
                    "category": 1,
                    "status": 1
                }
            },
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        posts = []
        async for post_doc in cursor:
            post_dict = post_doc.copy()
            post_dict["id"] = str(post_dict.pop("_id"))
            posts.append(PostSummary(**post_dict))
        
        return posts

    async def update_post(self, post_id: str, post_data: PostUpdate, user_id: str, user_role: str = "user") -> Optional[PostInDB]:
        if not ObjectId.is_valid(post_id) or not ObjectId.is_valid(user_id):
            return None
        
        update_data = {k: v for k, v in post_data.dict(exclude_unset=True).items()}
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            # Build query based on user role
            query = {"_id": ObjectId(post_id)}
            if user_role != "admin":
                # Regular users can only edit their own posts
                query["author_id"] = ObjectId(user_id)
            
            result = await self.collection.update_one(
                query,
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                post_doc = await self.collection.find_one({"_id": ObjectId(post_id)})
                if post_doc:
                    return PostInDB(**post_doc)
        
        return None

    async def delete_post(self, post_id: str, user_id: str, user_role: str = "user") -> bool:
        if not ObjectId.is_valid(post_id) or not ObjectId.is_valid(user_id):
            return False
        
        # Users can only delete their own posts, admins can delete any post
        match_condition = {"_id": ObjectId(post_id)}
        if user_role != "admin":
            match_condition["author_id"] = ObjectId(user_id)
        
        result = await self.collection.delete_one(match_condition)
        return result.deleted_count > 0

    async def like_post(self, post_id: str, user_id: str) -> bool:
        if not ObjectId.is_valid(post_id) or not ObjectId.is_valid(user_id):
            return False
        
        user_obj_id = ObjectId(user_id)
        
        # Check if already liked
        post = await self.collection.find_one({"_id": ObjectId(post_id)})
        if not post:
            return False
        
        if user_obj_id in post.get("liked_by", []):
            return False  # Already liked
        
        # Add like
        result = await self.collection.update_one(
            {"_id": ObjectId(post_id)},
            {
                "$addToSet": {"liked_by": user_obj_id},
                "$inc": {"likes_count": 1}
            }
        )
        
        return result.modified_count > 0

    async def unlike_post(self, post_id: str, user_id: str) -> bool:
        if not ObjectId.is_valid(post_id) or not ObjectId.is_valid(user_id):
            return False
        
        user_obj_id = ObjectId(user_id)
        
        # Remove like
        result = await self.collection.update_one(
            {"_id": ObjectId(post_id), "liked_by": user_obj_id},
            {
                "$pull": {"liked_by": user_obj_id},
                "$inc": {"likes_count": -1}
            }
        )
        
        return result.modified_count > 0

    async def increment_views(self, post_id: str) -> bool:
        if not ObjectId.is_valid(post_id):
            return False
        
        result = await self.collection.update_one(
            {"_id": ObjectId(post_id)},
            {"$inc": {"views_count": 1}}
        )
        
        return result.modified_count > 0

    async def get_posts_count(self, **filters) -> int:
        match_conditions = {}
        
        if "status" in filters and filters["status"]:
            match_conditions["status"] = filters["status"]
            
        if "category" in filters and filters["category"]:
            match_conditions["category"] = filters["category"]
            
        if "tags" in filters and filters["tags"]:
            match_conditions["tags"] = {"$in": filters["tags"]}
            
        if "author_id" in filters and filters["author_id"] and ObjectId.is_valid(filters["author_id"]):
            match_conditions["author_id"] = ObjectId(filters["author_id"])
            
        if "search" in filters and filters["search"]:
            match_conditions["$or"] = [
                {"title": {"$regex": filters["search"], "$options": "i"}},
                {"content": {"$regex": filters["search"], "$options": "i"}},
                {"excerpt": {"$regex": filters["search"], "$options": "i"}}
            ]
        
        return await self.collection.count_documents(match_conditions)

