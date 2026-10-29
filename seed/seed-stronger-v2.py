#!/usr/bin/env python3
"""Seed the Stronger chapters v2 into Sanity (drafts.project-stronger).

Run from the repo root on a machine whose .env.local holds a write-scoped token:

    python3 seed/seed-stronger-v2.py            # writes the draft
    python3 seed/seed-stronger-v2.py --dry-run  # prints the document, no token needed

What it does:
  1. Uploads the PNGs under seed/stronger-figma/ that the chapters reference
     (skips ones already uploaded, matched by sha1).
  2. Reads the published project-stronger document.
  3. Writes drafts.project-stronger = published doc + the v2 chapters.

Nothing is published; read the draft in the Studio and hit Publish.
"""
import hashlib
import json
import os
import re
import sys
import urllib.parse
import urllib.request

PROJECT = "v3d28bxo"
DATASET = "production"
API = f"https://{PROJECT}.api.sanity.io/v2025-01-01"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "seed", "stronger-figma")


def token():
    if "--dry-run" in sys.argv:
        return ""
    env = os.environ.get("SANITY_API_WRITE_TOKEN") or os.environ.get("SANITY_API_READ_TOKEN")
    if env:
        return env
    path = os.path.join(ROOT, ".env.local")
    with open(path) as fh:
        for line in fh:
            m = re.match(r"^SANITY_API_READ_TOKEN=(.*)$", line.strip())
            if m:
                return m.group(1).strip().strip('"').strip("'")
    sys.exit("No Sanity token found (SANITY_API_READ_TOKEN in .env.local)")


TOKEN = token()


def call(method, url, body=None, content_type="application/json"):
    data = None
    if body is not None:
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method)
    if TOKEN:
        req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", content_type)
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def query(groq, params=None):
    q = urllib.parse.urlencode({"query": groq, **{f"${k}": json.dumps(v) for k, v in (params or {}).items()}})
    return call("GET", f"{API}/data/query/{DATASET}?{q}")["result"]


def upload_image(filename):
    path = os.path.join(IMG_DIR, filename)
    with open(path, "rb") as fh:
        blob = fh.read()
    sha1 = hashlib.sha1(blob).hexdigest()
    existing = query('*[_type=="sanity.imageAsset" && sha1hash==$sha][0]._id', {"sha": sha1})
    if existing:
        print(f"  {filename}: already uploaded as {existing}")
        return existing
    res = call(
        "POST",
        f"{API}/assets/images/{DATASET}?filename={urllib.parse.quote(filename)}",
        blob,
        content_type="image/png",
    )
    asset_id = res["document"]["_id"]
    print(f"  {filename}: uploaded as {asset_id}")
    return asset_id


def blocks(paragraphs, key):
    out = []
    for i, text in enumerate(paragraphs):
        out.append(
            {
                "_type": "block",
                "_key": f"{key}-p{i}",
                "style": "normal",
                "markDefs": [],
                "children": [{"_type": "span", "_key": f"{key}-p{i}s", "text": text, "marks": []}],
            }
        )
    return out


def main():
    dry = "--dry-run" in sys.argv
    with open(os.path.join(ROOT, "seed", "stronger-chapters-v2.json")) as fh:
        spec = json.load(fh)

    print("Uploading images")
    chapters = []
    for ch in spec["chapters"]:
        media = ch["media"]
        if media["type"] == "image":
            ref = media["image"]
            if ref.startswith("file:"):
                ref = "image-DRYRUN-png" if dry else upload_image(ref[len("file:"):])
            media_doc = {"type": "image", "image": {"_type": "image", "asset": {"_type": "reference", "_ref": ref}}}
        else:
            media_doc = {"type": "video", "video": {"_type": "file", "asset": {"_type": "reference", "_ref": media["video"]}}}
        chapters.append(
            {
                "_type": "chapter",
                "_key": ch["_key"],
                "title": ch["title"],
                "text": blocks(ch["text"], ch["_key"]),
                "caption": ch.get("caption"),
                "layout": ch["layout"],
                "side": ch["side"],
                "media": media_doc,
            }
        )

    print("Reading published project-stronger")
    doc = query('*[_id=="project-stronger"][0]')
    if not doc:
        sys.exit("project-stronger is not published; publish it first or seed the full document")
    for k in ("_rev", "_updatedAt", "_createdAt"):
        doc.pop(k, None)
    doc["_id"] = "drafts.project-stronger"
    doc["chapters"] = chapters

    if dry:
        json.dump(doc, sys.stdout, indent=2, ensure_ascii=False)
        print("\nDry run: nothing written.")
        return
    print("Writing drafts.project-stronger")
    res = call("POST", f"{API}/data/mutate/{DATASET}", {"mutations": [{"createOrReplace": doc}]})
    print(json.dumps(res))
    print("Done. Open the Stronger document in the Studio, read the draft, then Publish.")


if __name__ == "__main__":
    main()
