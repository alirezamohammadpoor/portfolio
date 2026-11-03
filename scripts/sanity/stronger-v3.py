#!/usr/bin/env python3
"""Stronger page, new shape (Ali, 11-02): write it to Sanity as a draft.

Copy comes from src/app/(site)/lab/stronger/copy.json, the same file the
/lab/stronger preview renders, so what you saw there is what lands here.

It builds drafts.project-stronger from the existing draft (or the published
document when there is none) and:
  1. uploads the five-test compilation (+ poster) and the cropped product
     page phone clip from public/lab/stronger/ (reused by sha1 if present);
  2. puts the compilation on the home card (coverMedia) and as gallery item 1,
     the landing media on the project page;
  3. sets the claim as the description and the stack;
  4. replaces chapters: background (laptop + phone), the statement before the
     switcher, the switcher (kept as it is: backdrop, media; title cleared,
     test copy in plain English, morph keys set), the badge result with its
     table, and the hygiene chapter.

Nothing is published: read the draft in the Studio and hit Publish once the
code that knows the new fields (statement, subtext, table, phone, pair
layouts) is merged.

  python3 scripts/sanity/stronger-v3.py --dry-run   # no token, prints the draft
  python3 scripts/sanity/stronger-v3.py             # uploads + writes the draft

Token: SANITY_TOKEN in the environment, or SANITY_API_READ_TOKEN (write
capable) from .env.local in this checkout or ~/Developer/portfolio-layout.
"""
import hashlib
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

PROJECT, DATASET = "v3d28bxo", "production"
API = f"https://{PROJECT}.api.sanity.io/v2024-01-01"
ROOT = Path(__file__).resolve().parents[2]
COPY = ROOT / "src/app/(site)/lab/stronger/copy.json"
DRY = "--dry-run" in sys.argv
CONTENT_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4"}


def token():
    if os.environ.get("SANITY_TOKEN"):
        return os.environ["SANITY_TOKEN"]
    for env in (ROOT / ".env.local", Path.home() / "Developer/portfolio-layout/.env.local"):
        if env.exists():
            for line in env.read_text().splitlines():
                m = re.match(r"^SANITY_API_READ_TOKEN=(.*)$", line.strip())
                if m:
                    return m.group(1).strip().strip('"').strip("'")
    return ""


TOKEN = token()
if not DRY and not TOKEN:
    sys.exit("No Sanity token: set SANITY_TOKEN or SANITY_API_READ_TOKEN in .env.local")


def call(method, url, body=None, content_type="application/json"):
    data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
    req = urllib.request.Request(url, data=data, method=method)
    if TOKEN:
        req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", content_type)
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def query(groq, params=None):
    q = urllib.parse.urlencode({"query": groq, **{f"${k}": json.dumps(v) for k, v in (params or {}).items()}})
    return call("GET", f"{API}/data/query/{DATASET}?{q}")["result"]


def upload(ref):
    """'public:/lab/x.mp4' -> uploads public/lab/x.mp4 (or reuses it); a Sanity id passes through."""
    if not ref.startswith("public:"):
        return ref
    path = ROOT / "public" / ref[len("public:/"):]
    kind = "file" if path.suffix == ".mp4" else "image"
    if DRY:
        return f"{kind}-DRYRUN-{path.name}"
    blob = path.read_bytes()
    sha1 = hashlib.sha1(blob).hexdigest()
    doc_type = "sanity.fileAsset" if kind == "file" else "sanity.imageAsset"
    existing = query(f'*[_type=="{doc_type}" && sha1hash==$sha][0]._id', {"sha": sha1})
    if existing:
        print(f"  {path.name}: already uploaded as {existing}")
        return existing
    res = call(
        "POST",
        f"{API}/assets/{'files' if kind == 'file' else 'images'}/{DATASET}?filename=stronger-{urllib.parse.quote(path.name)}",
        blob,
        content_type=CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream"),
    )
    print(f"  {path.name}: uploaded as {res['document']['_id']}")
    return res["document"]["_id"]


def blocks(paragraphs, key):
    return [
        {
            "_type": "block",
            "_key": f"{key}-p{i}",
            "style": "normal",
            "markDefs": [],
            "children": [{"_type": "span", "_key": f"{key}-p{i}s", "text": text, "marks": []}],
        }
        for i, text in enumerate(paragraphs)
    ]


def video(m):
    doc = {"type": "video", "video": {"_type": "file", "asset": {"_type": "reference", "_ref": upload(m["video"])}}}
    if m.get("poster"):
        doc["poster"] = {"_type": "image", "asset": {"_type": "reference", "_ref": upload(m["poster"])}}
    return doc


def main():
    copy = json.loads(COPY.read_text())
    doc = query('*[_id=="drafts.project-stronger"][0]') or query('*[_id=="project-stronger"][0]')
    if not doc:
        sys.exit("project-stronger not found")
    print(f"Building on {doc['_id']}")
    for k in ("_rev", "_updatedAt", "_createdAt"):
        doc.pop(k, None)
    doc["_id"] = "drafts.project-stronger"

    switcher = next((c for c in doc.get("chapters") or [] if c.get("_type") == "testSwitcher"), None)
    if not switcher:
        sys.exit("No test switcher on the Stronger document to keep")
    switcher = {**switcher, "title": None}
    switcher.pop("title")
    tests = []
    for t in switcher.get("tests") or []:
        c = copy["tests"].get(t.get("label") or "")
        if c:
            t = {**t, **{k: c[k] for k in ("hypothesis", "metric", "result", "decision", "morph")}, "text": blocks([c["text"]], t["_key"])}
            t.pop("status", None)
        tests.append(t)
    switcher["tests"] = tests

    chapters = []
    for c in copy["chapters"]:
        if c["_key"] == "switcher":
            chapters.append(switcher)
            continue
        ch = {"_type": "chapter", "_key": c["_key"]}
        for k in ("statement", "title", "subtext", "caption", "layout"):
            if c.get(k):
                ch[k] = c[k]
        if c.get("text"):
            ch["text"] = blocks(c["text"], c["_key"])
        if c.get("table"):
            ch["media"] = {
                "type": "table",
                "table": [{"_type": "tableRow", "_key": f"row-{i}", "cells": cells} for i, cells in enumerate(c["table"])],
            }
        elif c.get("media"):
            ch["media"] = video(c["media"])
        if c.get("phone"):
            ch["phone"] = video(c["phone"])
        chapters.append(ch)
    doc["chapters"] = chapters

    comp = upload(copy["compilation"]["video"])
    comp_ref = {"_type": "file", "asset": {"_type": "reference", "_ref": comp}}
    doc["coverMedia"] = {**(doc.get("coverMedia") or {}), "type": "video", "video": comp_ref}
    gallery = doc.get("gallery") or []
    first = {"_type": "galleryVideo", "_key": "v3-compilation", "video": comp_ref}
    if gallery and gallery[0].get("_type") == "galleryVideo":
        first = {**gallery[0], "video": comp_ref}
        gallery = gallery[1:]
    doc["gallery"] = [first, *gallery]

    doc["fullDescription"] = blocks([copy["claim"]], "v3-claim")
    doc["techStack"] = copy["stack"]

    if DRY:
        print(json.dumps(doc, indent=2, ensure_ascii=False))
        print("\nDry run: nothing written.")
        return
    res = call("POST", f"{API}/data/mutate/{DATASET}", {"mutations": [{"createOrReplace": doc}]})
    print(json.dumps(res))
    print("Done: drafts.project-stronger written. Read it in the Studio, then Publish.")


if __name__ == "__main__":
    main()
