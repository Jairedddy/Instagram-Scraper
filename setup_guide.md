# Setup Guide - InstaInsights

Follow these steps exactly, starting from an empty folder on any OS (Windows, Mac, Linux).

---

## Prerequisites

| Tool    | Minimum Version | Check                  | Install                             |
|---------|-----------------|------------------------|-------------------------------------|
| Python  | 3.9+            | `python --version`     | https://www.python.org/downloads/   |
| pip     | bundled with Python | `pip --version`    | Comes with Python                   |
| Browser | Any modern      | —                      | Chrome / Firefox / Edge             |

> **Windows users**: When installing Python, tick **"Add Python to PATH"**

---

## Step 1 - Get the files

### Option A: Copy the files manuall
Copy the entire `instagram-scraper/` folder to your computer.

### Option B: If you have Git
```bash
git clone <your-repo-url>
cd instagram-scraper
```

Open the `instagram-scraper` folder in **VS Code** (or any editor):
```bash
code instagram-scraper
```

---

## Step 2 - Set up Backend

open a **terminal** (VS Code: `Terminal -> New Terminal`).

### 2a. Navigate to the backend folder
```bash
cd backend
```

### 2b. (Optional but recommended) Create a virtual environment
```bash
# Mac / Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venc\Scripts\activate
```

You should see `(venv)` in your prompt. This isolates project dependencies.

### 2c. Install dependencies
```bash
pip install -r requirements.txt
```

This installs:
- **fastapi** - web framework
- **uvicorn** - ASGI server
- **instaloader** - Instagram scraping library
- **python-dotenv** - environment variable loader
- **httpx** - async HTTP client
- **pydantic** - data validation

### 2d. Set up environment variables
```bash
# Mac / Linux
cp .env.example .env

# Windows
copy .env.example .env
```

The default values in `.env` are fine for most users. Open `.env` to adjsut:

```
LOG_LEVEL=INFO        # DEBUG for verbose logs
RATE_LIMIT_PAUSE=1.5  # Seconds between post requests
MAX_RETRIES=2         # Retry attempts on failure
```

### 2e. Start the backend server
```bash
uvicorn main:app --reload
```

You should see:
```
INFO:   Started server process [12345]
INFO:   Uvicorn running on http://127.0.0.1:8000
```

Keep this terminal open. The `--reload` flag auto-restarts on code changes.

---

## Step 3 - Open the Frontend

You do **not** need a seperate server for the frontend.

### Option A: Open directly in browser
1. Open your file manager / Finder
2. Navigate to `instagram-scraper/frontend/`
3. Double-click `index.html`

### Option B: From the terminal
```bash
# Mac
open frontend/index.html

# Windows
start frontend/index.html

# Linux
xdg-open frontend/index.html
```

### Option C: VS Code Live Server (optional, nice for development)
1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` -> **Open with Live Server**

---

## Step 4 - Use the App

1. The app opens in your browser
2. Enter the Instagram username (without `@`) in the input field
3. Drag the slider to choose how many posts to fetch (3-15)
4. Click **Fetch Posts**
5. Wait a few seconds - the scraper fetches post with polite delays
6. View the profile overview to re-order posts
7. Use the **Sort** dropdown to re-order posts
8. Click **Export JSON** to download the full dataset

---

## Step 5 - Example Usage

### Research a business before cold outreach:
```
Username: nationalgeographic
Posts: 9
```

You'll see:
- The last 9 posts sorted by likes (highest engagement first)
- Full captions - themes, tone, hashtags, CTAs
- Media type - are they posting more Reels or images?
- Engagement numbers - how active is the audience?

### Export and share:
The exported JSON looks like:

```json
{
    "username": "nationalgeographic",
    "full_name": "National Geographic",
    "biography": "...",
    "followers": 280000000,
    "following": 150,
    "post_count": 31432,
    "posts": [
        {
            "caption": "Every journey begines with a single step...",
            "likes": 48239,
            "media_type": "image",
            "url": "https://instagram.com/p/SHORTCODE",
            "timestamp": "2024-05-01T14:30:00Z",
            "shortcode": "SHORTCODE"
        }
    ]
}
```

---

## Troubleshooting

### "Cannot reach the backend"
- Make sure `uvicorn main:app --reload` is still running in your terminal
- Make sure you're in the `backend/` folder when running it
- Check the terminal for error messages

### "The account does not exist"
- Double-check the spelling of the username
- Try searching for it on Instagram.com first

### "Private account"
- InstaInsights only works with **public** profiles
- There is no workaround - Instagram blocks access to private accounts

### Rate limited / slow responses
- Instagram temporarily limits rapid requests. Try again in 30-60 seconds
- Increase `RATE_LIMIT_PAUSE` in `.env` to reduce the chance of hitting limits

### 'ModuleNotFoundError' when starting backend
- Make sure you ran `pip install -r requirements.txt`
- If using a vitualenv, confirm its activated (you see `(venv)` in the prompt)

### CORS errors in browser console
- Make sure the backend is running on `http://127.0.0.1/8000` (default)
- Do not change the port unless you also update `API_BASE` in `frontend/script.js`

### Like showing as 0
- Some accounts hide their like counts - this is an Instagram setting, not a bug

---

## Checking Logs

Logs are written to both the terminal and `backend/app.log`.

```bash
# View live logs (Mac/Linus)
tail -f backend/app.log

# View last 50 lines (all OS via Python)
python -c "
import collections
lines = open('app.log).readlines()
print(''.join(list(collections.deque(lines, 50))))
"
```

Set `LOG_LEVEL=DEBUG` in `.env` for verbose output.

---

## Stopping the App

Press `Ctrl + C` in the terminal uvicorn.

To deactivate the virtual environment:
```bash
deactivate
```

---

## API Reference (for developers)

The backend exposes a simple REST API:

### `GET /health`
Returns `{"status": "ok"}` - use to verify the server is up.

### `POST /api/fetch`
**Request body:**
```json
{
    "username": "instagram_username",
    "max_posts": 9
}
```

**Response**
```json
{
    "username": "string",
    "full_name": "string",
    "biography": "string",
    "followers": 0,
    "following": 0,
    "post_count": 0,
    "profile_pic_url": "string",
    "is_verified": false,
  "fetched_at": "2024-01-01T00:00:00Z",
  "posts": [
    {
      "caption": "string",
      "likes": 0,
      "media_type": "image | video | reel | carousel",
      "url": "string",
      "timestamp": "2024-01-01T00:00:00Z",
      "shortcode": "string"
    }
  ]
}
```
 
**Error responses:**
- `400` — Empty username
- `422` — Known scraper error (private account, not found, etc.)
- `500` — Unexpected server error
 
Interactive API docs are available at: http://127.0.0.1:8000/docs
