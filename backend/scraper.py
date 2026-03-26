"""
scraper.py — Instagram public profile scraper
Uses instaloader (no login required for public accounts).
Falls back to a lightweight HTTP approach if needed.
"""

import logging
import time
import os
from datetime import datetime, timezone
from typing import Optional

import instaloader

logger = logging.getLogger("scraper")

INSTALOADER_RATE_LIMIT_PAUSE = float(os.getenv("RATE_LIMIT_PAUSE", "1.5"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "2"))


class ScraperError(Exception):
    """Raised for known, user-facing scraping errors."""


class InstagramScraper:
    def __init__(self):
        self._loader = self._build_loader()
    def _build_loader(self) -> instaloader.Instaloader:
        L = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            quiet=True,
            fatal_status_codes=[400, 403, 404, 429],
        )
        return L

    def fetch(self, username: str, max_posts: int = 12) -> dict:
        attempt = 0
        last_exc: Optional[Exception] = None

        while attempt <= MAX_RETRIES:
            try:
                return self._do_fetch(username, max_posts)
            except ScraperError:
                raise  
            except instaloader.exceptions.ProfileNotExistsException:
                raise ScraperError(
                    f"The account '@{username}' does not exist on Instagram."
                )
            except instaloader.exceptions.PrivateProfileNotFollowedException:
                raise ScraperError(
                    f"@{username} is a private account. Only public profiles are supported."
                )
            except instaloader.exceptions.LoginRequiredException:
                raise ScraperError(
                    f"Instagram requires a login to access @{username}. "
                    "This account may be private or age-restricted."
                )
            except instaloader.exceptions.QueryReturnedBadRequestException:
                raise ScraperError(
                    f"Instagram returned a bad request for @{username}. "
                    "The account may be suspended or the username invalid."
                )
            except instaloader.exceptions.TooManyRequestsException:
                logger.warning(
                    f"Rate limited by Instagram (attempt {attempt + 1}/{MAX_RETRIES + 1}). "
                    f"Waiting {INSTALOADER_RATE_LIMIT_PAUSE * 3:.1f}s…"
                )
                time.sleep(INSTALOADER_RATE_LIMIT_PAUSE * 3)
                last_exc = None 
            except instaloader.exceptions.ConnectionException as e:
                logger.warning(
                    f"Connection error (attempt {attempt + 1}/{MAX_RETRIES + 1}): {e}"
                )
                time.sleep(INSTALOADER_RATE_LIMIT_PAUSE)
                last_exc = e
            except Exception as e:
                logger.error(f"Unexpected scraper error: {e}", exc_info=True)
                last_exc = e

            attempt += 1

        raise ScraperError(
            f"Failed to fetch data for @{username} after {MAX_RETRIES + 1} attempts. "
            f"Last error: {last_exc or 'rate limit exceeded'}"
        )
    def _do_fetch(self, username: str, max_posts: int) -> dict:
        try:
            profile = instaloader.Profile.from_username(self._loader.context, username)
        except instaloader.exceptions.ProfileNotExistsException:
            raise  
        except instaloader.exceptions.PrivateProfileNotFollowedException:
            raise

        if profile.is_private:
            raise ScraperError(
                f"@{username} is a private account. Only public profiles are supported."
            )

        posts = []
        post_iter = profile.get_posts()

        for i, post in enumerate(post_iter):
            if i >= max_posts:
                break

            try:
                caption = post.caption or ""
                likes = post.likes if post.likes is not None else 0
                media_type = self._detect_media_type(post)
                url = f"https://www.instagram.com/p/{post.shortcode}/"
                timestamp = post.date_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

                posts.append(
                    {
                        "caption": caption.strip(),
                        "likes": likes,
                        "media_type": media_type,
                        "url": url,
                        "timestamp": timestamp,
                        "shortcode": post.shortcode,
                    }
                )
                if i < max_posts - 1:
                    time.sleep(INSTALOADER_RATE_LIMIT_PAUSE)

            except Exception as e:
                logger.warning(f"Skipping post {i} for @{username}: {e}")
                continue

        if not posts:
            raise ScraperError(
                f"No posts found for @{username}. "
                "The account may be empty or have no accessible posts."
            )
        posts.sort(key=lambda p: p["likes"], reverse=True)

        return {
            "username": username,
            "full_name": profile.full_name or "",
            "biography": profile.biography or "",
            "followers": profile.followers,
            "following": profile.followees,
            "post_count": profile.mediacount,
            "profile_pic_url": profile.profile_pic_url,
            "is_verified": profile.is_verified,
            "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "posts": posts,
        }

    @staticmethod
    def _detect_media_type(post: instaloader.Post) -> str:
        if post.is_video:
            try:
                if post.video_view_count is not None and post.video_duration and post.video_duration < 90:
                    return "reel"
            except Exception:
                pass
            return "video"
        if post.typename == "GraphSidecar":
            return "carousel"
        return "image"