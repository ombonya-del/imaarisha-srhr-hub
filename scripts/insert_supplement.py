#!/usr/bin/env python3
"""
Insert curated ImaarishaSRHR bookmark candidates into public.radar_items.

Run this in YOUR OWN terminal (not the Claude sandbox) so it can reach Supabase:

    python3 scripts/insert_supplement.py [path/to/pending_supplement_*.json]

Reads SUPABASE_URL + SERVICE_KEY from scripts/.secrets (never printed).
Dedupes by url against existing radar_items, then inserts the rest.
Safe to re-run: already-present urls are skipped.
"""
import json, os, sys, urllib.request, urllib.error, glob

HERE = os.path.dirname(os.path.abspath(__file__))

def load_secrets():
    path = os.path.join(HERE, ".secrets")
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    url = env.get("SUPABASE_URL", "").rstrip("/")
    key = env.get("SERVICE_KEY", "")
    if not url or not key or key == "PASTE_YOUR_SERVICE_ROLE_KEY_HERE":
        sys.exit("ERROR: SUPABASE_URL / SERVICE_KEY missing in scripts/.secrets")
    return url, key

def req(method, url, key, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("apikey", key)
    r.add_header("Authorization", "Bearer " + key)
    r.add_header("Content-Type", "application/json")
    if method == "POST":
        r.add_header("Prefer", "return=minimal")
    with urllib.request.urlopen(r, timeout=30) as resp:
        raw = resp.read().decode()
        return resp.status, raw

def main():
    url, key = load_secrets()
    # pick candidates file
    if len(sys.argv) > 1:
        cand_path = sys.argv[1]
    else:
        hits = sorted(glob.glob(os.path.join(HERE, "pending_supplement_*.json")))
        if not hits:
            sys.exit("ERROR: no pending_supplement_*.json found in scripts/")
        cand_path = hits[-1]
    with open(cand_path) as f:
        doc = json.load(f)
    candidates = doc.get("candidates", [])
    print(f"Loaded {len(candidates)} candidate(s) from {os.path.basename(cand_path)}")

    # dedupe: fetch all existing urls (paged)
    existing = set()
    offset, page = 0, 1000
    while True:
        status, raw = req("GET", f"{url}/rest/v1/radar_items?select=url&limit={page}&offset={offset}", key)
        rows = json.loads(raw)
        for row in rows:
            if row.get("url"):
                existing.add(row["url"])
        if len(rows) < page:
            break
        offset += page
    print(f"Existing radar_items urls: {len(existing)}")

    cols = ("source_name","title","snippet","url","platform","published_at",
            "srhr_relevance","harm_score","sentiment","typology","is_disinfo","languages")
    inserted, skipped, failed = [], [], []
    for c in candidates:
        if not c.get("title"):
            failed.append((c.get("url","?"), "missing title")); continue
        if c.get("url") in existing:
            skipped.append(c.get("url")); continue
        row = {k: c[k] for k in cols if k in c}
        try:
            st, _ = req("POST", f"{url}/rest/v1/radar_items", key, row)
            if st in (200, 201, 204):
                inserted.append(c["url"]); existing.add(c["url"])
            else:
                failed.append((c.get("url","?"), f"HTTP {st}"))
        except urllib.error.HTTPError as e:
            failed.append((c.get("url","?"), f"HTTP {e.code}: {e.read().decode()[:200]}"))
        except Exception as e:
            failed.append((c.get("url","?"), str(e)))

    print("\n=== SUMMARY ===")
    print(f"Inserted: {len(inserted)}")
    for u in inserted: print("  +", u)
    print(f"Skipped (already present): {len(skipped)}")
    for u in skipped: print("  =", u)
    if failed:
        print(f"Failed: {len(failed)}")
        for u, why in failed: print("  !", u, "->", why)
    print("\nDone. Inserted rows are LIVE (radar_items is public-read).")

if __name__ == "__main__":
    main()
