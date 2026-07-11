#!/usr/bin/env python3
"""
Schema / contract smoke test for Imaarisha SRHR Hub (ukweli + hub2).

Verifies that every table + column the front-end queries still exists in the
live Supabase database. A missing/renamed column makes PostgREST return HTTP
400 (42703); this catches that before it ships silently.

Run:  python3 scripts/schema_check.py
Exits non-zero (and prints the offending table/column) if anything is missing.

Uses the public anon key (already shipped in the frontend + radar workflow).
Override with SUPABASE_URL / SUPABASE_ANON_KEY env vars if needed.
"""
import os
import sys
import requests

SUPABASE_URL = (
    os.environ.get("SUPABASE_URL") or "https://uwxtqyqyrhhxqagaqelg.supabase.co"
).rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY") or (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eHRxeXF5cmhoeHFhZ2FxZWxnIiwi"
    "cm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTA3MTUsImV4cCI6MjA4OTIyNjcxNX0"
    ".dLa7RY6awZC4HXnyUtoIXPZ8KJV0EEpPQR8YdOQ3hdA"
)
HEADERS = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}

# ── Column contracts: the exact columns the code SELECTs by name. ───────────
COLUMN_CONTRACTS = {
    "activity_log": ["description", "entity_title", "dot_color", "created_at"],
    "discussions": ["subject", "reply_count", "view_count"],
    "event_rsvps": ["event_id", "status"],
    "fika_facilities": ["id", "name", "county"],
    "tracker_indicators": ["name", "current_value", "unit"],
}

# ── Existence-only checks: other tables the apps + radar pipeline depend on. ─
EXISTENCE_ONLY = [
    "unado_posts", "organizations", "profiles", "uliza_questions",
    "radar_items", "radar_index", "resources", "fika_suggestions",
    "fika_reviews", "disinformation_claims", "ukweli_cards", "events",
    "discussion_replies", "tracker_submissions", "marketplace_listings",
]

TIMEOUT = 15
failures = []


def check_columns(table, cols):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={','.join(cols)}&limit=1"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    except Exception as e:
        failures.append(f"{table}: request error — {e}")
        return
    if r.status_code == 200:
        print(f"  OK   {table} ({len(cols)} columns)")
    elif r.status_code == 400:
        failures.append(f"{table}: {r.text[:200]}")
        print(f"  FAIL {table} — {r.text[:120]}")
    elif r.status_code in (401, 403):
        print(f"  OK   {table} (exists, RLS-protected — {r.status_code})")
    else:
        failures.append(f"{table}: unexpected HTTP {r.status_code} — {r.text[:120]}")
        print(f"  WARN {table} — HTTP {r.status_code}")


def check_exists(table):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=1"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    except Exception as e:
        failures.append(f"{table}: request error — {e}")
        return
    if r.status_code in (200, 401, 403):
        print(f"  OK   {table}")
    else:
        failures.append(f"{table}: HTTP {r.status_code} — {r.text[:120]}")
        print(f"  FAIL {table} — HTTP {r.status_code}")


def main():
    print(f"Schema check against {SUPABASE_URL}")
    print("\nColumn contracts:")
    for table, cols in COLUMN_CONTRACTS.items():
        check_columns(table, cols)
    print("\nTable existence:")
    for table in EXISTENCE_ONLY:
        check_exists(table)

    print()
    if failures:
        print(f"SCHEMA CHECK FAILED — {len(failures)} problem(s):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    print("SCHEMA CHECK PASSED — all tables and columns present.")


if __name__ == "__main__":
    main()
