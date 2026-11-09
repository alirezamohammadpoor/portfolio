#!/usr/bin/env python3
"""Paul & Friends loops -> Sanity DRAFT (Ali OK'd the eight loops 11-09).

Uploads P1-P8 (+ posters) from this folder's parent (or DIR argument) and
writes drafts.project-paul-and-friends with the gallery:
  [0] the current landing clip (kept as is, cover untouched)
  [1-6] galleryVideo P1 home, P2 menus, P3 brand PLP, P4 filter, P5 PDP->bag, P6 Shop the Look
  [7] galleryPhones P7 mobile menu + P8 mobile PDP->bag
Builds on an existing draft when there is one. Never publishes.

  python3 pnf-loops-draft.py --dry-run [DIR]
  python3 pnf-loops-draft.py [DIR]

Token: SANITY_TOKEN, or SANITY_API_READ_TOKEN from ~/Developer/portfolio-layout/.env.local
"""
import json, os, secrets, sys, urllib.parse, urllib.request
from pathlib import Path

PROJECT, DATASET = "v3d28bxo", "production"
API = f"https://{PROJECT}.api.sanity.io/v2024-01-01"
DOC = "project-paul-and-friends"
ENV = Path.home() / "Developer/portfolio-layout/.env.local"
DRY = "--dry-run" in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith("--")]
DIR = Path(args[0]) if args else Path(__file__).resolve().parent.parent
LAPTOP = ["P1", "P2", "P3", "P4", "P5", "P6"]
PHONES = ["P7", "P8"]


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
        doc = req(f"{API}/assets/{kind}/{DATASET}?filename={urllib.parse.quote('paul-and-friends-' + path.name)}", f.read(), ctype, "POST")
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
landing = (base.get("gallery") or [None])[0]
if not landing or landing.get("_type") != "galleryVideo":
    sys.exit("gallery[0] is not the landing video; stopping so nothing is lost")

gallery = [landing]
for name in LAPTOP:
    v, p = clip(name)
    gallery.append({"_key": key(), "_type": "galleryVideo", "video": ref("file", v), "poster": ref("image", p),
                    "videoWidth": 1920, "videoHeight": 1200})
phones = []
for name in PHONES:
    v, p = clip(name)
    phones.append({"_key": key(), "_type": "phoneSlot", "type": "video", "video": ref("file", v), "poster": ref("image", p)})
gallery.append({"_key": key(), "_type": "galleryPhones", "phones": phones})

draft = {k: v for k, v in base.items() if not k.startswith("_") or k in ("_type",)}
draft.update(_id=f"drafts.{DOC}", _type="project", gallery=gallery)
print(f"draft gallery: landing + {', '.join(LAPTOP)} + phones({', '.join(PHONES)})")
if DRY:
    print("dry run: nothing written")
    sys.exit(0)
res = req(f"{API}/data/mutate/{DATASET}?returnIds=true", json.dumps({"mutations": [{"createOrReplace": draft}]}).encode(), "application/json", "POST")
print("written:", res.get("results"))
print("Check it in the Studio / preview, then publish there. The live site is unchanged.")
