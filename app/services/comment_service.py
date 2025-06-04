from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from app.models.comment import CommentCreate, CommentUpdate, CommentInDB, Comment

class CommentService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.database = database
        self.collection = database.comments
        self.posts_collection = database.posts
        self.users_collection = database.users

    async def create_comment(self, comment_data: CommentCreate, author_id: str) -> CommentInDB:
        if not ObjectId.is_valid(author_id) or not ObjectId.is_valid(comment_data.post_id):
            raise ValueError("Invalid author ID or post ID")
        
        # Verify post exists
        post_exists = await self.posts_collection.find_one({"_id": ObjectId(comment_data.post_id)})
        if not post_exists:
            raise ValueError("Post not found")
        
        # Verify parent comment exists if specified
        if comment_data.parent_id:
            if not ObjectId.is_valid(comment_data.parent_id):
                raise ValueError("Invalid parent comment ID")
            parent_exists = await self.collection.find_one({"_id": ObjectId(comment_data.parent_id)})
            if not parent_exists:
                raise ValueError("Parent comment not found")
        
        comment_dict = {
            "content": comment_data.content,
            "post_id": ObjectId(comment_data.post_id),
            "author_id": ObjectId(author_id),
            "parent_id": ObjectId(comment_data.parent_id) if comment_data.parent_id else None,
            "created_at": datetime.utcnow()
        }
        
        result = await self.collection.insert_one(comment_dict)
        comment_dict["_id"] = result.inserted_id
        
        # Update post comment count
        await self.posts_collection.update_one(
            {"_id": ObjectId(comment_data.post_id)},
            {"$inc": {"comments_count": 1}}
        )
        
        return CommentInDB(**comment_dict)

    async def get_comment_by_id(self, comment_id: str) -> Optional[Comment]:
        if not ObjectId.is_valid(comment_id):
            return None
        
        pipeline = [
            {"$match": {"_id": ObjectId(comment_id)}},
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
                    "author_profile_picture": "$author.profile_picture"
                }
            },
            {
                "$project": {
                    "author": 0  # Remove the author object
                }
            }
        ]
        
        cursor = self.collection.aggregate(pipeline)
        comment_doc = await cursor.to_list(length=1)
        
        if comment_doc:
            comment_dict = comment_doc[0]
            comment_dict["post_id"] = str(comment_dict["post_id"])
            comment_dict["author_id"] = str(comment_dict["author_id"])
            if comment_dict.get("parent_id"):
                comment_dict["parent_id"] = str(comment_dict["parent_id"])
            return Comment(**comment_dict)
        return None

    async def get_comments_by_post(
        self, 
        post_id: str, 
        skip: int = 0, 
        limit: int = 50,
        include_replies: bool = True
    ) -> List[Comment]:
        if not ObjectId.is_valid(post_id):
            return []
        
        # First get top-level comments
        pipeline = [
            {
                "$match": {
                    "post_id": ObjectId(post_id),
                    "parent_id": None
                }
            },
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
                    "author_profile_picture": "$author.profile_picture"
                }
            },
            {
                "$project": {
                    "author": 0  # Remove the author object
                }
            },
            {"$sort": {"created_at": 1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        comments = []
        
        async for comment_doc in cursor:
            comment_dict = comment_doc.copy()
            comment_dict["post_id"] = str(comment_dict["post_id"])
            comment_dict["author_id"] = str(comment_dict["author_id"])
            if comment_dict.get("parent_id"):
                comment_dict["parent_id"] = str(comment_dict["parent_id"])
            
            comment = Comment(**comment_dict)
            
            # Get replies if requested
            if include_replies:
                comment.replies = await self._get_comment_replies(str(comment_dict["_id"]))
            
            comments.append(comment)
        
        return comments

    async def _get_comment_replies(self, parent_id: str) -> List[Comment]:
        """Get replies for a specific comment"""
        if not ObjectId.is_valid(parent_id):
            return []
        
        pipeline = [
            {"$match": {"parent_id": ObjectId(parent_id)}},
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
                    "author_profile_picture": "$author.profile_picture"
                }
            },
            {
                "$project": {
                    "author": 0  # Remove the author object
                }
            },
            {"$sort": {"created_at": 1}}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        replies = []
        
        async for reply_doc in cursor:
            reply_dict = reply_doc.copy()
            reply_dict["post_id"] = str(reply_dict["post_id"])
            reply_dict["author_id"] = str(reply_dict["author_id"])
            if reply_dict.get("parent_id"):
                reply_dict["parent_id"] = str(reply_dict["parent_id"])
            
            # Recursively get nested replies
            reply = Comment(**reply_dict)
            reply.replies = await self._get_comment_replies(str(reply_dict["_id"]))
            replies.append(reply)
        
        return replies

    async def update_comment(self, comment_id: str, comment_data: CommentUpdate, author_id: str) -> Optional[CommentInDB]:
        if not ObjectId.is_valid(comment_id) or not ObjectId.is_valid(author_id):
            return None
        
        update_data = {k: v for k, v in comment_data.dict(exclude_unset=True).items()}
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            update_data["is_edited"] = True
            
            result = await self.collection.update_one(
                {"_id": ObjectId(comment_id), "author_id": ObjectId(author_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                comment_doc = await self.collection.find_one({"_id": ObjectId(comment_id)})
                if comment_doc:
                    return CommentInDB(**comment_doc)
        
        return None

    async def delete_comment(self, comment_id: str, user_id: str, user_role: str = "user") -> bool:
        if not ObjectId.is_valid(comment_id) or not ObjectId.is_valid(user_id):
            return False
        
        # Get comment to check post_id for updating count
        comment = await self.collection.find_one({"_id": ObjectId(comment_id)})
        if not comment:
            return False
        
        # Users can only delete their own comments, admins can delete any comment
        match_condition = {"_id": ObjectId(comment_id)}
        if user_role != "admin":
            match_condition["author_id"] = ObjectId(user_id)
        
        # Count all comments to be deleted (including nested replies)
        delete_count = await self._count_comments_tree(comment_id)
        
        # Delete the comment and all its replies
        await self._delete_comment_tree(comment_id)
        
        # Update post comment count
        await self.posts_collection.update_one(
            {"_id": comment["post_id"]},
            {"$inc": {"comments_count": -delete_count}}
        )
        
        return True

    async def _count_comments_tree(self, parent_id: str) -> int:
        """Count comment and all its nested replies"""
        if not ObjectId.is_valid(parent_id):
            return 0
        
        count = 1  # Count the parent comment
        
        # Find all direct replies
        replies = await self.collection.find({"parent_id": ObjectId(parent_id)}).to_list(None)
        
        # Recursively count replies
        for reply in replies:
            count += await self._count_comments_tree(str(reply["_id"]))
        
        return count

    async def _delete_comment_tree(self, parent_id: str):
        """Delete comment and all its nested replies"""
        if not ObjectId.is_valid(parent_id):
            return
        
        # Find all direct replies
        replies = await self.collection.find({"parent_id": ObjectId(parent_id)}).to_list(None)
        
        # Recursively delete replies
        for reply in replies:
            await self._delete_comment_tree(str(reply["_id"]))
        
        # Delete the parent comment
        await self.collection.delete_one({"_id": ObjectId(parent_id)})

    async def get_comments_count(self, post_id: str) -> int:
        if not ObjectId.is_valid(post_id):
            return 0
        
        return await self.collection.count_documents({"post_id": ObjectId(post_id)})

