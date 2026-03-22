#!/usr/bin/env python3
"""Backfill older session rows with drawing_url and color_palette.

Default mode is dry-run (no writes). Use --apply to write updates.

What this script backfills:
1) sessions.drawing_url (top-level)
   - from data.drawing_url if present
   - otherwise infer from SUPABASE_URL + drawings/{session_id}.png
2) sessions.data.color_palette
   - from data.canvas_summary.colors_used (first 5 valid color tokens)

Usage examples:
  python scripts/backfill_sessions.py
  python scripts/backfill_sessions.py --limit 50 --dry-run
  python scripts/backfill_sessions.py --limit 50 --apply
"""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from typing import Any

from dotenv import load_dotenv

from supabase_client import get_supabase

load_dotenv()

HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{3,8}$")
FUNC_COLOR = re.compile(r"^(rgba?|hsla?)\(")


@dataclass
class BackfillPlan:
    session_id: str
    top_level_drawing_url: str | None
    data_drawing_url: str | None
    color_palette: list[str] | None


def is_color_token(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    color = value.strip()
    if not color:
        return False
    return bool(HEX_COLOR.match(color) or FUNC_COLOR.match(color))


def infer_public_drawing_url(session_id: str) -> str | None:
    supabase_url = (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
    if not supabase_url:
        return None
    return f"{supabase_url}/storage/v1/object/public/drawings/{session_id}.png"


def derive_palette(data: dict[str, Any]) -> list[str] | None:
    if not isinstance(data, dict):
        return None
    existing = data.get("color_palette")
    if isinstance(existing, list) and any(is_color_token(c) for c in existing):
        cleaned = [c for c in existing if is_color_token(c)]
        return cleaned[:5] if cleaned else None

    summary = data.get("canvas_summary")
    if not isinstance(summary, dict):
        return None

    candidates = summary.get("colors_used")
    if not isinstance(candidates, list):
        return None

    unique: list[str] = []
    for item in candidates:
        if is_color_token(item) and item not in unique:
            unique.append(item)

    return unique[:5] if unique else None


def build_plan(row: dict[str, Any]) -> BackfillPlan | None:
    session_id = str(row.get("id") or "").strip()
    if not session_id:
        return None

    current_drawing_url = (row.get("drawing_url") or "").strip() or None
    data = row.get("data") if isinstance(row.get("data"), dict) else {}
    data_drawing_url = (data.get("drawing_url") or "").strip() or None

    next_top_level_url = current_drawing_url
    next_data_url = data_drawing_url

    if not next_top_level_url:
        if data_drawing_url:
            next_top_level_url = data_drawing_url
        else:
            inferred = infer_public_drawing_url(session_id)
            if inferred:
                next_top_level_url = inferred
                next_data_url = inferred

    palette = derive_palette(data)

    needs_top_level_url = next_top_level_url and next_top_level_url != current_drawing_url
    needs_data_url = next_data_url and next_data_url != data_drawing_url
    current_palette = data.get("color_palette") if isinstance(data.get("color_palette"), list) else None
    needs_palette = bool(palette and palette != current_palette)

    if not (needs_top_level_url or needs_data_url or needs_palette):
        return None

    return BackfillPlan(
        session_id=session_id,
        top_level_drawing_url=next_top_level_url if needs_top_level_url else None,
        data_drawing_url=next_data_url if needs_data_url else None,
        color_palette=palette if needs_palette else None,
    )


def fetch_rows(limit: int, user_id: str | None) -> list[dict[str, Any]]:
    client = get_supabase()
    query = client.table("sessions").select("id, created_at, drawing_url, data")
    if user_id:
        query = query.eq("user_id", user_id)
    query = query.order("created_at", desc=True).limit(limit)
    result = query.execute()
    return result.data or []


def apply_plan(client: Any, row: dict[str, Any], plan: BackfillPlan) -> None:
    payload: dict[str, Any] = {}

    if plan.top_level_drawing_url:
        payload["drawing_url"] = plan.top_level_drawing_url

    data = row.get("data") if isinstance(row.get("data"), dict) else {}
    next_data = dict(data)

    if plan.data_drawing_url:
        next_data["drawing_url"] = plan.data_drawing_url

    if plan.color_palette:
        next_data["color_palette"] = plan.color_palette

    if next_data != data:
        payload["data"] = next_data

    if payload:
        client.table("sessions").update(payload).eq("id", plan.session_id).execute()


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill sessions drawing_url + color_palette")
    parser.add_argument("--limit", type=int, default=30, help="Max sessions to scan (default: 30)")
    parser.add_argument("--user-id", type=str, default=None, help="Optional user_id filter")
    parser.add_argument("--dry-run", action="store_true", help="Preview only (default behavior)")
    parser.add_argument("--apply", action="store_true", help="Write updates to Supabase")
    args = parser.parse_args()

    do_apply = bool(args.apply)
    if args.dry_run:
        do_apply = False

    rows = fetch_rows(limit=args.limit, user_id=args.user_id)

    if not rows:
        print("No session rows found.")
        return 0

    plans: list[tuple[dict[str, Any], BackfillPlan]] = []
    for row in rows:
        plan = build_plan(row)
        if plan:
            plans.append((row, plan))

    print(f"Scanned: {len(rows)} sessions")
    print(f"Needs backfill: {len(plans)} sessions")
    print(f"Mode: {'APPLY' if do_apply else 'DRY-RUN'}")

    if not plans:
        return 0

    for idx, (_, plan) in enumerate(plans[:10], start=1):
        print(f"\n[{idx}] session={plan.session_id}")
        if plan.top_level_drawing_url:
            print(f"  - set drawing_url: {plan.top_level_drawing_url}")
        if plan.data_drawing_url:
            print(f"  - set data.drawing_url: {plan.data_drawing_url}")
        if plan.color_palette:
            print(f"  - set data.color_palette: {json.dumps(plan.color_palette)}")

    if len(plans) > 10:
        print(f"\n... and {len(plans) - 10} more")

    if not do_apply:
        print("\nDry-run complete. Re-run with --apply to persist these changes.")
        return 0

    client = get_supabase()
    updated = 0
    for row, plan in plans:
        apply_plan(client, row, plan)
        updated += 1

    print(f"\nApplied updates to {updated} sessions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
