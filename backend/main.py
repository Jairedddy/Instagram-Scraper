import logging
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from scraper import InstagramScraper, ScraperError
import json

load_dotenv()

log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("main")

app = FastAPI(
    title="Instagram Insights API",
    description="Fetch public Instagram post data for outreach research",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scraper = InstagramScraper()

class ScrapeRequest(BaseModel):
    username: str
    max_posts: int = 12
    
    
@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/fetch")
def fetch_posts(req: ScrapeRequest):
    username = req.username.strip().lstrip("@")
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty.")
    
    max_posts = max(3, min(req.max_posts, 15))
    logger.info(f"Fetching posts for @{username} (max={max_posts})")
    
    try:
        result = scraper.fetch(username, max_posts=max_posts)
        logger.info(f"Fetched {len(result['posts'])} posts for @{username}")
        return JSONResponse(content=result)
    except ScraperError as e:
        logger.warning(f"Scraper error for @{username}: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error for @{username}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")