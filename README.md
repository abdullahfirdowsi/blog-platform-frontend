# Blog Platform Backend

A modern, asynchronous FastAPI backend for a blog platform with MongoDB database, featuring JWT authentication, image uploads, and comprehensive content management.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - Google OAuth integration
  - Role-based access control
  - Password hashing with bcrypt

- **Content Management**
  - Full CRUD operations for blog posts
  - Rich text content support
  - Image upload via Cloudinary integration
  - Comment system with nested replies
  - Like/unlike functionality
  - Category and tag management

- **API Features**
  - RESTful API design
  - Async/await support for better performance
  - Comprehensive input validation
  - Automatic API documentation
  - CORS support for frontend integration

## 🛠️ Tech Stack

- **Framework**: FastAPI
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT (python-jose) + OAuth2
- **File Storage**: Cloudinary
- **Validation**: Pydantic v2
- **Testing**: Pytest with async support
- **Code Quality**: Black, isort, flake8

## 📋 Prerequisites

- Python 3.8+
- MongoDB (local or cloud instance)
- Cloudinary account (for image uploads)
- Google Cloud Console project (for OAuth, optional)

## ⚡ Quick Start

### 1. Clone and Setup Environment

```bash
# Clone the repository
git clone <repository-url>
cd blog-platform/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
# Install production dependencies
pip install -r requirements.txt

# For development (includes testing and linting tools)
pip install -r requirements-dev.txt
```

### 3. Environment Configuration

```bash
# Copy environment template
copy .env.example .env  # Windows
# cp .env.example .env   # macOS/Linux
```

Edit `.env` file with your configuration:

```env
# MongoDB settings
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=blogplatform

# JWT settings
SECRET_KEY=your-super-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS settings
BACKEND_CORS_ORIGINS=["http://localhost:4200","http://localhost:3000"]

# Cloudinary for image uploads
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Start the Server

```bash
# Development server with auto-reload
uvicorn main:app --reload

# Production server
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## 📖 API Documentation

Once the server is running, access the interactive documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## 🔧 Development

### Code Formatting and Linting

```bash
# Format code with Black
black .

# Sort imports with isort
isort .

# Lint with flake8
flake8

# Run all formatting tools
black . && isort . && flake8
```

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py
```

### Database Management

The application automatically:
- Connects to MongoDB on startup
- Creates necessary indexes
- Handles connection lifecycle

## 📁 Project Structure

```
backend/
├── app/
│   ├── core/              # Core functionality
│   │   ├── config.py      # Application configuration
│   │   ├── security.py    # JWT and security utilities
│   │   ├── password_utils.py # Password hashing
│   │   └── init_db.py     # Database initialization
│   ├── models/            # Pydantic models for database
│   │   ├── user.py        # User model
│   │   ├── post.py        # Blog post model
│   │   └── comment.py     # Comment model
│   ├── routers/           # API route handlers
│   │   ├── auth.py        # Authentication endpoints
│   │   ├── users.py       # User management
│   │   ├── posts.py       # Blog post operations
│   │   ├── comments.py    # Comment operations
│   │   └── upload.py      # File upload handling
│   ├── services/          # Business logic layer
│   │   ├── user_service.py
│   │   ├── post_service.py
│   │   ├── comment_service.py
│   │   └── upload.py
│   ├── schemas/           # Request/response schemas
│   └── utils/             # Utility functions
├── tests/                 # Test files
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── main.py               # Application entry point
├── requirements.txt      # Production dependencies
└── requirements-dev.txt  # Development dependencies
```

## 🔐 Authentication Flow

1. **Registration/Login**: User provides credentials
2. **Token Generation**: Server returns access + refresh tokens
3. **API Access**: Include access token in Authorization header
4. **Token Refresh**: Use refresh token to get new access token

```bash
# Example API calls
curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password"}'

curl -X GET "http://localhost:8000/api/v1/users/me" \
     -H "Authorization: Bearer <access_token>"
```

## 🚀 Deployment

### Docker (Recommended)

```dockerfile
# Dockerfile example
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables for Production

- Set strong `SECRET_KEY`
- Configure proper MongoDB connection string
- Set up Cloudinary for file uploads
- Configure CORS origins for your frontend domain
- Use environment-specific settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 style guidelines
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **Import Errors**
   - Ensure virtual environment is activated
   - Reinstall dependencies: `pip install -r requirements.txt`

3. **JWT Token Issues**
   - Check `SECRET_KEY` in environment
   - Verify token expiration settings

4. **File Upload Errors**
   - Verify Cloudinary credentials
   - Check file size limits
   - Ensure proper file formats

### Getting Help

- Check the [API documentation](http://localhost:8000/docs)
- Review application logs
- Open an issue on GitHub

## 📊 API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | User registration | No |
| POST | `/api/v1/auth/login` | User login | No |
| POST | `/api/v1/auth/refresh` | Refresh token | Yes |
| GET | `/api/v1/users/me` | Get current user | Yes |
| GET | `/api/v1/posts` | List all posts | No |
| POST | `/api/v1/posts` | Create new post | Yes |
| GET | `/api/v1/posts/{id}` | Get specific post | No |
| PUT | `/api/v1/posts/{id}` | Update post | Yes |
| DELETE | `/api/v1/posts/{id}` | Delete post | Yes |
| POST | `/api/v1/posts/{id}/comments` | Add comment | Yes |
| GET | `/api/v1/posts/{id}/comments` | Get comments | No |

For complete API documentation, visit `/docs` endpoint when server is running.
