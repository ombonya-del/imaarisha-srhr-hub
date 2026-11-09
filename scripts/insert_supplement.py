#!/usr/bin/env python3
"""
Insert curated ImaarishaSRHR bookmark candidates into public.radar_items.

Runs in two places:
  * GitHub Actions (.github/workflows/insert-supplement.yml) on every pushed
    pending_supplement_*.json -- reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
    from the environment (repo secret).
  * Your own terminal, as a manual fallback:
        python3 scripts/insert_supplement.py [path/to/pending_supplement_*.json]
    -- reads SUPABASE_URL + SERVICE_KEY from scripts/.secrets.
The key is never printed.

Dedupes by url against existing radar_items, then inserts the rest.
Safe to re-run: already-present urls are skipped.

radar_items is PUBLIC-read, so anything inserted goes live. Candidates whose
review_note contains "SENSITIVE", or that set "hold": true, are HELD (not
inserted) unless the candidate also sets "approved": true.
"""
import json, os, sys, urllib.request, urllib.error, glob

HERE = os.path.dirname(os.path.abspath(__file__))

def load_secrets():
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if url and key:
        return url, key
    path = os.path.join(HERE, ".secrets")
    if not os.path.exists(path):
        sys.exit("ERROR: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or create scripts/.secrets")
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
        sys.exit("ERROR: SUPABASE_URL / SERVICE_KEY missing")
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

def is_held(c):
    if c.get("approved") is True:
        return False
    return c.get("hold") is True or "SENSITIVE" in str(c.get("review_note", "")).upper()

def write_step_summary(name, inserted, skipped, held, failed):
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    with open(path, "a") as f:
        f.write(f"### {name}\n\n")
        f.write(f"- Inserted (now live): {len(inserted)}\n")
        for u in inserted: f.write(f"  - {u}\n")
        f.write(f"- Skipped, already present: {len(skipped)}\n")
        f.write(f"- Held for approval: {len(held)}\n")
        for u in held: f.write(f"  - {u}\n")
        f.write(f"- Failed: {len(failed)}\n")
        for u, why in failed: f.write(f"  - {u} -> {why}\n")
        f.write("\n")

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
    inserted, skipped, held, failed = [], [], [], []
    for c in candidates:
        if not c.get("title"):
            failed.append((c.get("url","?"), "missing title")); continue
        if c.get("url") in existing:
            skipped.append(c.get("url")); continue
        if is_held(c):
            held.append(c.get("url")); continue
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
    print(f"Held for approval (SENSITIVE/hold, set \"approved\": true to insert): {len(held)}")
    for u in held: print("  ?", u)
    if failed:
        print(f"Failed: {len(failed)}")
        for u, why in failed: print("  !", u, "->", why)
    write_step_summary(os.path.basename(cand_path), inserted, skipped, held, failed)
    print("\nDone. Inserted rows are LIVE (radar_items is public-read).")
    if failed:
        sys.exit(1)

if __name__ == "__main__":
    main()
