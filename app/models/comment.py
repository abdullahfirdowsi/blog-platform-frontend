from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from .user import PyObjectId

class CommentBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

class CommentCreate(CommentBase):
    post_id: str
    parent_id: Optional[str] = None  # For nested comments

class CommentUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=1000)

class CommentInDB(CommentBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    post_id: PyObjectId
    author_id: PyObjectId
    parent_id: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    is_edited: bool = False
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class Comment(CommentBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    post_id: str
    author_id: str
    author_username: Optional[str] = None  # Populated from join
    author_full_name: Optional[str] = None  # Populated from join
    author_profile_picture: Optional[str] = None  # Populated from join
    parent_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_edited: bool = False
    replies: List['Comment'] = Field(default_factory=list)  # Nested comments
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

# Update forward reference
Comment.model_rebuild()

