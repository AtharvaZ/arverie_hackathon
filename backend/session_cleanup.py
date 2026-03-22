def get_stale_session_ids(
    session_last_seen: dict[str, float],
    now_ts: float,
    ttl_seconds: int,
) -> list[str]:
    """Return session IDs that have exceeded TTL since last activity."""
    cutoff = now_ts - ttl_seconds
    return [session_id for session_id, last_seen in session_last_seen.items() if last_seen < cutoff]