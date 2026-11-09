#!/usr/bin/env python3
"""Sania D'mina gallery -> Sanity DRAFT (Ali OK'd the storyboarded gallery 11-09).

Uploads P1-P8 (+ posters) from this folder's parent (or DIR argument) and
writes drafts.project-paul-and-friends with the gallery:
  [0] C1 home (replaces the old landing clip; cover untouched)
  [1] C2 menu -> Boots, [2] phones row (C3a still, C3b menu -> Knee-High, C3c Elena)
  [3] C4 Heels -> Elena, [4] C5 colours, [5] C6 sizes, [6] C7 journal
Builds on an existing draft when there is one. Never publishes.

  python3 sania-gallery-draft.py --dry-run [DIR]
  python3 sania-gallery-draft.py [DIR]

Token: SANITY_TOKEN, or SANITY_API_READ_TOKEN from ~/Developer/portfolio-layout/.env.local
"""
import json, os, secrets, sys, urllib.parse, urllib.request
from pathlib import Path

PROJECT, DATASET = "v3d28bxo", "production"
API = f"https://{PROJECT}.api.sanity.io/v2024-01-01"
DOC = "980e5a87-865e-4153-ab92-78872dd6b622"
ENV = Path.home() / "Developer/portfolio-layout/.env.local"
DRY = "--dry-run" in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith("--")]
DIR = Path(args[0]) if args else Path(__file__).resolve().parent


def token():
    if os.environ.get("SANITY_TOKEN"):
        return os.environ["SANITY_TOKEN"]
    for line in ENV.read_text().splitlines():
        if line.startswith("SANITY_API_READ_TOKEN="):
            return line.split("=", 1)[1].strip().strip("'\"")
    sys.exit(f"no token in {ENV}")


TOKEN = token()


def req(url, data=None, ctype=None, method=None):
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", f"Bearer {TOKEN}")
    if ctype:
        r.add_header("Content-Type", ctype)
    with urllib.request.urlopen(r) as resp:
        return json.load(resp)


def get(doc_id):
    q = "*[_id == $id][0]"
    url = f"{API}/data/query/{DATASET}?" + urllib.parse.urlencode({"query": q, "$id": json.dumps(doc_id), "perspective": "raw"})
    return req(url)["result"]


def upload(path, kind, ctype):
    if DRY:
        return f"<new {path.name}>"
    with open(path, "rb") as f:
        doc = req(f"{API}/assets/{kind}/{DATASET}?filename={urllib.parse.quote('sania-d-mina-' + path.name)}", f.read(), ctype, "POST")
    print(f"  uploaded {path.name} -> {doc['document']['_id']}")
    return doc["document"]["_id"]


def ref(kind, asset_id):
    return {"_type": kind, "asset": {"_type": "reference", "_ref": asset_id}}


def key():
    return secrets.token_hex(6)


def clip(name):
    mp4, jpg = DIR / f"{name}.mp4", DIR / f"{name}-poster.jpg"
    for p in (mp4, jpg):
        if not p.exists():
            sys.exit(f"missing {p}")
    return upload(mp4, "files", "video/mp4"), upload(jpg, "images", "image/jpeg")


base = get(f"drafts.{DOC}") or get(DOC)
if not base:
    sys.exit(f"{DOC} not found")
print(f"base: {base['_id']} (rev {base.get('_rev')}), gallery {len(base.get('gallery') or [])} items")
def video(name):
    v, p = clip(name)
    return {"_key": key(), "_type": "galleryVideo", "video": ref("file", v), "poster": ref("image", p),
            "videoWidth": 1920, "videoHeight": 1200}

def slot(name):
    v, p = clip(name)
    return {"_key": key(), "_type": "phoneSlot", "type": "video", "video": ref("file", v), "poster": ref("image", p)}

still = DIR / "C3a.jpg"
if not still.exists():
    sys.exit(f"missing {still}")
gallery = [video("C1"), video("C2"),
           {"_key": key(), "_type": "galleryPhones", "phones": [
               {"_key": key(), "_type": "phoneSlot", "type": "image", "image": ref("image", upload(still, "images", "image/jpeg"))},
               slot("C3b"), slot("C3c")]},
           video("C4"), video("C5"), video("C6"), video("C7")]
draft = {k: v for k, v in base.items() if not k.startswith("_") or k in ("_type",)}
draft.update(_id=f"drafts.{DOC}", _type="project", gallery=gallery)
print("draft gallery: C1, C2, phones(C3a still, C3b, C3c), C4, C5, C6, C7")
if DRY:
    print("dry run: nothing written")
    sys.exit(0)
res = req(f"{API}/data/mutate/{DATASET}?returnIds=true", json.dumps({"mutations": [{"createOrReplace": draft}]}).encode(), "application/json", "POST")
print("written:", res.get("results"))
print("Check it in the Studio / preview, then publish there. The live site is unchanged.")
