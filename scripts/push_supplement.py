#!/usr/bin/env python3
"""
Publish a curated batch to GitHub so the "Insert bookmark supplement"
workflow inserts it into radar_items. Used by the daily scheduled sweep.

    python3 scripts/push_supplement.py scripts/pending_supplement_<date>.json [--wait]

Writes the file straight to main through the GitHub contents API, so it works
even when the local clone is behind or a stale .git/*.lock blocks git.
Reads GH_TOKEN from the environment or scripts/.secrets (never printed).
The token needs Contents: read & write on this repo; add Actions: read for --wait.

--wait polls the workflow run for the new commit (up to ~4 min) and prints
its conclusion. Exit codes: 0 ok, 1 push failed, 2 workflow failed or did
not report in time, 3 token missing/invalid.
"""
import base64, json, os, sys, time, urllib.request, urllib.error

REPO = "ombonya-del/imaarisha-srhr-hub"
BRANCH = "main"
WORKFLOW = "insert-supplement.yml"
HERE = os.path.dirname(os.path.abspath(__file__))


def load_token():
    tok = os.environ.get("GH_TOKEN", "")
    path = os.path.join(HERE, ".secrets")
    if not tok and os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("GH_TOKEN="):
                    tok = line.split("=", 1)[1].strip().strip('"').strip("'")
    return tok


def gh(method, path, token, body=None):
    url = path if path.startswith("http") else f"https://api.github.com{path}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", f"Bearer {token}")
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("X-GitHub-Api-Version", "2022-11-28")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, {"message": raw[:200]}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    wait = "--wait" in sys.argv
    if len(args) != 1:
        sys.exit(__doc__)
    local = args[0]
    name = os.path.basename(local)
    if not name.startswith("pending_supplement_") or not name.endswith(".json"):
        sys.exit("ERROR: expected a scripts/pending_supplement_<date>.json file")
    with open(local, "rb") as f:
        content = f.read()
    json.loads(content)  # refuse to publish invalid JSON

    token = load_token()
    if not token:
        print("ERROR: GH_TOKEN not set (env or scripts/.secrets)")
        sys.exit(3)
    st, _ = gh("GET", f"/repos/{REPO}", token)
    if st != 200:
        print(f"ERROR: GH_TOKEN rejected for {REPO} (HTTP {st})")
        sys.exit(3)

    remote = f"scripts/{name}"
    st, cur = gh("GET", f"/repos/{REPO}/contents/{remote}?ref={BRANCH}", token)
    body = {
        "message": f"Bookmark supplement: {name}",
        "content": base64.b64encode(content).decode(),
        "branch": BRANCH,
    }
    if st == 200:
        if base64.b64decode(cur.get("content", "")) == content:
            print(f"{remote} already on {BRANCH} with identical content; nothing to push.")
            print("To re-run the insert, dispatch the workflow for this file.")
            return
        body["sha"] = cur["sha"]
    st, res = gh("PUT", f"/repos/{REPO}/contents/{remote}", token, body)
    if st not in (200, 201):
        print(f"ERROR: push failed (HTTP {st}): {res.get('message', '')}")
        sys.exit(1)
    sha = res["commit"]["sha"]
    print(f"Pushed {remote} to {BRANCH} as {sha[:7]}")

    if not wait:
        return
    deadline = time.time() + 240
    run = None
    while time.time() < deadline:
        time.sleep(15)
        st, runs = gh("GET", f"/repos/{REPO}/actions/workflows/{WORKFLOW}/runs?head_sha={sha}", token)
        if st == 403:
            print("Cannot read Actions with this token; check the run on GitHub.")
            sys.exit(2)
        if st == 200 and runs.get("workflow_runs"):
            run = runs["workflow_runs"][0]
            if run.get("status") == "completed":
                break
    if not run or run.get("status") != "completed":
        print("Workflow did not finish within 4 min; check the Actions tab.")
        sys.exit(2)
    print(f"Workflow {run['conclusion']}: {run['html_url']}")
    if run["conclusion"] != "success":
        sys.exit(2)


if __name__ == "__main__":
    main()
