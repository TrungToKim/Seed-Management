# Entrypoint for FastAPI
import os
import sys
import uvicorn

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == "__main__":
    # Render injection of $PORT environment variable
    port = int(os.getenv("PORT", 8000))
    print(f"Starting server on 0.0.0.0:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
