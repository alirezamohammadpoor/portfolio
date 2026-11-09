#!/usr/bin/env python3
"""Sania D'mina gallery trim -> Sanity DRAFT (Ali 11-09 15:00).

Rewrites the gallery of drafts.<sania id>, reusing the clips uploaded at 14:45
and uploading only the two re-shot clips (C6 size -> bag, C3c phone -> bag):
  [0] C1 home  [1] C2 menu -> Boots  [2] phones row C3b + C3c  [3] C4 Heels -> Elena
  [4] C5 colours  [5] C6 sizes -> add to bag.   Dropped: C7 journal, C3a phone still.
Never publishes.

  python3 -I sania-gallery-trim.py --dry-run
  python3 -I sania-gallery-trim.py

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


# uploaded on 11-09 14:45 (Ali's run of sania-gallery-draft.py)
UP = {
    "C1": ("file-f94f9ddec4b5500a6f00730c2a10a277cbc7814a-mp4", "image-a297ceb2b773c5ec8933f086f41c0772f2dceaf6-1920x1200-jpg"),
    "C2": ("file-a4f2f5ac93ad485f3538a0a720983e07232c7e3e-mp4", "image-bc0ecfc48c2c1c55c07c11d30adb2d4d5c5024e8-1920x1200-jpg"),
    "C3b": ("file-2c6bff4af4d66e5ebf66b8bc1861eccea5beae93-mp4", "image-881235950fa5ad95eba542b81d899cd93a516cc6-780x1688-jpg"),
    "C4": ("file-01756aac0ed14fb0fd4a690c155dcf86ed300122-mp4", "image-95f837fb910d86d0cc5136d8ad88db8641facb16-1920x1200-jpg"),
    "C5": ("file-e354bee4fc2fc00d28a5735a034b37b4b9670a75-mp4", "image-3eba5a218d36d7efaf7abebf8f735d2e9680ab0a-1920x1200-jpg"),
}

base = get(f"drafts.{DOC}")
if not base:
    sys.exit(f"drafts.{DOC} not found (expected the 14:45 draft)")
print(f"base: {base['_id']} (rev {base.get('_rev')}), gallery {len(base.get('gallery') or [])} items")
UP["C6"] = clip("C6")
UP["C3c"] = clip("C3c")


def video(name):
    v, p = UP[name]
    return {"_key": key(), "_type": "galleryVideo", "video": ref("file", v), "poster": ref("image", p),
            "videoWidth": 1920, "videoHeight": 1200}


def slot(name):
    v, p = UP[name]
    return {"_key": key(), "_type": "phoneSlot", "type": "video", "video": ref("file", v), "poster": ref("image", p)}


gallery = [video("C1"), video("C2"),
           {"_key": key(), "_type": "galleryPhones", "phones": [slot("C3b"), slot("C3c")]},
           video("C4"), video("C5"), video("C6")]
draft = {k: v for k, v in base.items() if not k.startswith("_") or k in ("_type",)}
draft.update(_id=f"drafts.{DOC}", _type="project", gallery=gallery)
print("draft gallery: C1, C2, phones(C3b, C3c new), C4, C5, C6 new")
if DRY:
    print("dry run: nothing written")
    sys.exit(0)
res = req(f"{API}/data/mutate/{DATASET}?returnIds=true", json.dumps({"mutations": [{"createOrReplace": draft}]}).encode(), "application/json", "POST")
print("written:", res.get("results"))
print("Check it in the Studio / preview, then publish there. The live site is unchanged.")
