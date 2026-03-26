# InstaInsight - Instagram Research Tool

A **free, local** web application for cold-outreach researchers to quickly pull public Instagram post data - captions, likes, media type, and post URLs - from any public profile.

---

## Features

- Fetch 3-15 latest posts from any **public** Instagram profile
- Displays captions, likes, media type (image / video / reel / carousel)
- Profile overview: followers, following, bio, post count
- Sort by engagement (likes), newest, or oldest
- Export full dataset as a downloadable JSON file
- 100% free - no API keys, no paid services
- Retry logic and clear error messages
- File + console logging

---

## Tech Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Backend  | Python · FastAPI · instaloader |
| Frontend | HTML5 · CSS3 · Vanilla JS   |
| Scraping | instaloader (no login required for public profiles) |

---

## Quick Start

See **[setup_guide.md](setup_guide.md)** for full step-by-step instructions.

```bash
# 1. Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload

# 2. Frontend (in a new terminal or file explorer)
# Open frontend/index.html in your browser
```

---

## Limitations

- **Private accounts** are not supported (Instagram blocks access without login)
- Instagram may rate-limit aggressive requests; the tool includes polite delays
- Post like counts may occassionally return 0 for accounts that hide them

---

## Project Structure

```
instagram-scraper/
├── backend/
│   ├── main.py          # FastAPI app + routes
│   ├── scraper.py       # instaloader scraping logic
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── README.md
└── setup_guide.md
```