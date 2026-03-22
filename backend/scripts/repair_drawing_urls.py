#!/usr/bin/env python3
"""Repair invalid session drawing URLs.

This script validates each session's drawing URL by attempting an HTTP GET.
If the URL is invalid (non-2xx), it clears broken drawing references so
frontend can surface real existing drawings instead of broken placeholders.

Usage:
  PYTHONPATH=$PWD venv/bin/python scripts/repair_drawing_urls.py --user-id <uuid> --dry-run
  PYTHONPATH=$PWD venv/bin/python scripts/repair_drawing_urls.py --user-id <uuid> --apply
"""

from __future__ import annotations

import argparse
from typing import Any

import requests
from dotenv import load_dotenv

from supabase_client import get_supabase

load_dotenv()


def validate_url(url: str) -> bool:
    try:
        response = requests.get(url, timeout=8)
        return 200 <= response.status_code < 300
    except Exception:
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Repair invalid drawing URLs")
    parser.add_argument("--user-id", required=True, help="Target user id")
    parser.add_argument("--limit", type=int, default=40, help="Sessions to scan")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--apply", action="store_true", help="Persist fixes")
    args = parser.parse_args()

    do_apply = bool(args.apply) and not args.dry_run

    client = get_supabase()
    rows = (
        client.table("sessions")
        .select("id,created_at,drawing_url,data")
        .eq("user_id", args.user_id)
        .order("created_at", desc=True)
        .limit(args.limit)
        .execute()
        .data
        or []
    )

    invalid_rows: list[dict[str, Any]] = []

    for row in rows:
        data = row.get("data") if isinstance(row.get("data"), dict) else {}
        row_url = str(row.get("drawing_url") or "").strip()
        data_url = str(data.get("drawing_url") or "").strip()
        url = row_url or data_url

        if not url:
            continue

        if not validate_url(url):
            invalid_rows.append(row)

    print(f"Scanned: {len(rows)}")
    print(f"Invalid drawing URLs: {len(invalid_rows)}")
    print(f"Mode: {'APPLY' if do_apply else 'DRY-RUN'}")

    for row in invalid_rows[:10]:
        print(f"- {row.get('created_at')} {row.get('id')}")

    if len(invalid_rows) > 10:
        print(f"... and {len(invalid_rows) - 10} more")

    if not do_apply:
        return 0

    for row in invalid_rows:
        data = row.get("data") if isinstance(row.get("data"), dict) else {}
        next_data = dict(data)
        if "drawing_url" in next_data:
            next_data.pop("drawing_url", None)

        client.table("sessions").update({"drawing_url": "", "data": next_data}).eq(
            "id", row.get("id")
        ).execute()

    print(f"Updated: {len(invalid_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
