import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional

load_dotenv()
logger = logging.getLogger(__name__)


def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


def create_session(user_id: str) -> str:
    """Insert a minimal session row and return the generated session_id."""
    try:
        client = get_supabase()
        result = client.table("sessions").insert({"user_id": user_id}).execute()
        session_id = result.data[0]["id"]
        logger.info(f"Created session row: {session_id}")
        return session_id
    except Exception as e:
        logger.error(f"Failed to create session in Supabase: {e}")
        raise


def get_sessions(user_id: str, limit: int = 50) -> list[dict]:
    """Return last N sessions for a user, ordered by created_at DESC."""
    try:
        client = get_supabase()
        result = (
            client.table("sessions")
            .select("id, created_at, mood_checkin, mood_checkout, drawing_url, data")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to fetch sessions for user {user_id}: {e}")
        return []


def complete_session(session_id: str, data: dict) -> None:
    """Single update with all session data. Called once at /session/complete."""
    try:
        client = get_supabase()
        client.table("sessions").update(data).eq("id", session_id).execute()
        logger.info(f"Session data written to Supabase: {session_id}")
    except Exception as e:
        logger.error(f"Failed to complete session {session_id} in Supabase: {e}")
        raise


def upload_drawing(session_id: str, image_bytes: bytes) -> str:
    """Upload PNG to drawings bucket as {session_id}.png and return the public URL."""
    try:
        client = get_supabase()
        file_name = f"{session_id}.png"
        client.storage.from_("drawings").upload(
            path=file_name,
            file=image_bytes,
            file_options={"content-type": "image/png", "upsert": "true"},
        )
        public_url = client.storage.from_("drawings").get_public_url(file_name)
        logger.info(f"Drawing uploaded for session {session_id}: {public_url}")
        return public_url
    except Exception as e:
        logger.error(f"Failed to upload drawing for session {session_id}: {e}")
        raise
