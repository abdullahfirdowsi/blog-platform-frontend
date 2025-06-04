# Blog Platform Backend

A FastAPI backend for the blog platform with MongoDB database.

## Features

- User authentication with JWT
- Blog post management
- Comment system
- Like functionality
- Category and tag support
- Role-based access control

## Prerequisites

- Python 3.8+
- MongoDB
- Poetry (optional)

## Setup

1. Clone the repository
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy .env.example to .env and update the values
5. Start the server:
   ```bash
   uvicorn main:app --reload
   ```

## API Documentation

Once the server is running, you can access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development

1. Install development dependencies:
   ```bash
   pip install -r requirements-dev.txt
   ```
2. Format code:
   ```bash
   black .
   isort .
   ```
3. Run linter:
   ```bash
   flake8
   ```

## Project Structure

```
backend/
├── app/
│   ├── core/          # Core functionality
│   ├── models/        # Pydantic models
│   ├── routers/       # API endpoints
│   ├── schemas/       # Database schemas
│   └── utils/         # Utility functions
├── tests/             # Test files
├── .env              # Environment variables
├── main.py           # Application entry point
└── requirements.txt  # Dependencies
```

