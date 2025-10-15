import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, models
from app.utils.logging import setup_logging

# Setup logging
setup_logging()

load_dotenv()

app = FastAPI(
    title="Chiron AI Service",
    description="FastAPI service for AI provider abstraction and model management",
    version="0.1.0",
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://localhost:3000",
    ],  # Tauri and Hono server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(models.router)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint"""
    return {"message": "Chiron AI Service", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
