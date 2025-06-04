from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from .user import PyObjectId

class PostBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    excerpt: Optional[str] = Field(None, max_length=500)
    cover_image: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    category: Optional[str] = None
    status: str = Field(default="published", pattern="^(draft|published)$")
    featured: bool = False

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    excerpt: Optional[str] = Field(None, max_length=500)
    cover_image: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(draft|published)$")
    featured: Optional[bool] = None

class PostInDB(PostBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    author_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    likes_count: int = 0
    comments_count: int = 0
    views_count: int = 0
    liked_by: List[PyObjectId] = Field(default_factory=list)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class Post(PostBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    author_id: str
    author_username: Optional[str] = None  # Populated from join
    author_full_name: Optional[str] = None  # Populated from join
    created_at: datetime
    updated_at: Optional[datetime] = None
    likes_count: int = 0
    comments_count: int = 0
    views_count: int = 0
    is_liked: bool = False  # For current user
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class PostSummary(BaseModel):
    id: str
    title: str
    excerpt: Optional[str] = None
    cover_image: Optional[str] = None
    author_username: str
    author_full_name: Optional[str] = None
    created_at: datetime
    likes_count: int = 0
    comments_count: int = 0
    tags: List[str] = []
    category: Optional[str] = None
    status: str

