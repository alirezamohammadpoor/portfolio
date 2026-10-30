#!/usr/bin/env python3
"""Seed the Stronger chapters (v3 lanes) into Sanity (drafts.project-stronger).

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


MEDIA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stronger-media")
CONTENT_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4"}


def upload_asset(filename, kind="image"):
    """Upload seed/stronger-figma/<png> or seed/stronger-media/<file>, reusing an existing asset by sha1."""
    folder = IMG_DIR if kind == "image" and os.path.exists(os.path.join(IMG_DIR, filename)) else MEDIA_DIR
    path = os.path.join(folder, filename)
    with open(path, "rb") as fh:
        blob = fh.read()
    sha1 = hashlib.sha1(blob).hexdigest()
    doc_type = "sanity.imageAsset" if kind == "image" else "sanity.fileAsset"
    existing = query(f'*[_type=="{doc_type}" && sha1hash==$sha][0]._id', {"sha": sha1})
    if existing:
        print(f"  {filename}: already uploaded as {existing}")
        return existing
    endpoint = "images" if kind == "image" else "files"
    res = call(
        "POST",
        f"{API}/assets/{endpoint}/{DATASET}?filename={urllib.parse.quote(filename)}",
        blob,
        content_type=CONTENT_TYPES.get(os.path.splitext(filename)[1].lower(), "application/octet-stream"),
    )
    asset_id = res["document"]["_id"]
    print(f"  {filename}: uploaded as {asset_id}")
    return asset_id


def upload_image(filename):
    return upload_asset(filename, "image")


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

    def media_doc(media):
        if media["type"] == "image":
            ref = media["image"]
            if ref.startswith("file:"):
                ref = "image-DRYRUN-png" if dry else upload_image(ref[len("file:"):])
            return {"type": "image", "image": {"_type": "image", "asset": {"_type": "reference", "_ref": ref}}}
        ref = media["video"]
        if ref.startswith("file:"):
            ref = "file-DRYRUN-mp4" if dry else upload_asset(ref[len("file:"):], "file")
        doc = {"type": "video", "video": {"_type": "file", "asset": {"_type": "reference", "_ref": ref}}}
        poster = media.get("poster")
        if poster:
            if poster.startswith("file:"):
                poster = "image-DRYRUN-jpg" if dry else upload_asset(poster[len("file:"):], "image")
            doc["poster"] = {"_type": "image", "asset": {"_type": "reference", "_ref": poster}}
        return doc

    chapters = []
    for ch in spec["chapters"]:
        if ch.get("_type") == "testSwitcher":
            chapters.append(
                {
                    "_type": "testSwitcher",
                    "_key": ch["_key"],
                    "title": ch.get("title"),
                    **(
                        {"backdrop": {"_type": "image", "asset": {"_type": "reference", "_ref": "image-DRYRUN-jpg" if dry else upload_asset(ch["backdrop"][len("file:"):], "image")}}}
                        if ch.get("backdrop")
                        else {}
                    ),
                    "tests": [
                        {
                            "_type": "abTest",
                            "_key": t["_key"],
                            "label": t["label"],
                            "title": t["title"],
                            "status": t.get("status"),
                            "hypothesis": t.get("hypothesis"),
                            "metric": t.get("metric"),
                            "result": t.get("result"),
                            "decision": t.get("decision"),
                            "text": blocks(t["text"], t["_key"]),
                            "caption": t.get("caption"),
                            "media": media_doc(t["media"]),
                        }
                        for t in ch["tests"]
                    ],
                }
            )
            continue
        doc = {
            "_type": "chapter",
            "_key": ch["_key"],
            "title": ch["title"],
            "text": blocks(ch["text"], ch["_key"]),
            "caption": ch.get("caption"),
            "layout": ch["layout"],
            "media": media_doc(ch["media"]),
        }
        if ch.get("side"):
            doc["side"] = ch["side"]
        chapters.append(doc)

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
