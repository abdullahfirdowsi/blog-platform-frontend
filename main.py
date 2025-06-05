from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.init_db import init_db
from app.routers import auth, users, posts, comments

@asynccontextmanager
async def lifespan(app):
    # Startup: connect to the MongoDB client
    app.mongodb_client = AsyncIOMotorClient(settings.MONGODB_URL)
    app.mongodb = app.mongodb_client[settings.MONGODB_DB_NAME]
    await init_db(app.mongodb)
    
    yield
    
    # Shutdown: close the MongoDB client
    app.mongodb_client.close()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# CORS middleware configuration
# Update CORS settings to include all localhost/127.0.0.1 variations for development
if not settings.BACKEND_CORS_ORIGINS:
    # Default CORS origins for development
    cors_origins = [
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
else:
    cors_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Router includes
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(posts.router, prefix=settings.API_V1_STR)
app.include_router(comments.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Blog Platform API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

