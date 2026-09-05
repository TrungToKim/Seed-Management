# Entrypoint for FastAPI
import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    # Render injection of $PORT environment variable
    port = int(os.getenv("PORT", 8000))
    is_dev = os.getenv("ENVIRONMENT", "development").lower() == "development"
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=is_dev)
