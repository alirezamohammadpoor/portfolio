#!/usr/bin/env python3
"""One sweep for flush media + Sanity backgrounds (Ali, 11-03).

For every project document it:
  1. Zone 2 only: gallery items 5 + 6 become one phones row (PDP still +
     menu clip), as Ali picked on 11-02;
  2. swaps every video whose recording had a background baked in for its
     flush re-encode in ~/Developer/portfolio-media/flush/<dir>/ (matched by
     the asset's original filename: "<slug> - <master>.mp4" ->
     "<slug>-<master>-flush.mp4", "<slug>-cover-flush.mp4" -> same name);
  3. moves the old backdrop fields onto the new `frame` background:
     homeBackdrop -> coverMedia.frame (image, 60 %), chapter media
     panel "black" -> frame hex #1a1a1a, panel "image" -> + image at 55 %;
     then unsets homeBackdrop / panel / panelImage.

It writes DRAFTS only (drafts.<id>, built from an existing draft when there
is one). The live site is untouched until you publish in the Studio, which
should happen after the background code is merged.

  python3 sweep-flush-backgrounds.py --dry-run   # no writes: prints the plan (reads drafts when a token is found)
  python3 sweep-flush-backgrounds.py             # uploads + writes drafts
  python3 sweep-flush-backgrounds.py --only zone-2 [--dry-run]   # one project first

Token: SANITY_API_READ_TOKEN (write-capable) from
~/Developer/portfolio-layout/.env.local, or SANITY_TOKEN in the environment.
"""
import copy, json, os, re, secrets, sys, urllib.parse, urllib.request
from pathlib import Path

PROJECT, DATASET = "v3d28bxo", "production"
API = f"https://{PROJECT}.api.sanity.io/v2024-01-01"
FLUSH = Path.home() / "Developer/portfolio-media/flush"
ENV = Path.home() / "Developer/portfolio-layout/.env.local"
DRY = "--dry-run" in sys.argv
ONLY = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
DIRS = {"zone-2": "zone2"}
SLUG_ALIAS = {"deploymentbar": "deploybar"}
PANEL_HEX = "#1a1a1a"  # bg-primary, what the "black" phones panel drew


def token():
    if os.environ.get("SANITY_TOKEN"):
        return os.environ["SANITY_TOKEN"]
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            if line.startswith("SANITY_API_READ_TOKEN="):
                return line.split("=", 1)[1].strip().strip("'\"")
    if DRY:
        return None  # the plan is computed from the published documents
    sys.exit(f"no token: set SANITY_TOKEN or add SANITY_API_READ_TOKEN to {ENV}")


TOKEN = token()


def req(url, data=None, ctype=None, method=None):
    r = urllib.request.Request(url, data=data, method=method)
    if TOKEN:
        r.add_header("Authorization", f"Bearer {TOKEN}")
    if ctype:
        r.add_header("Content-Type", ctype)
    with urllib.request.urlopen(r) as resp:
        return json.load(resp)


def query(q):
    return req(f"{API}/data/query/{DATASET}?" + urllib.parse.urlencode({"query": q}))["result"]


def flush_file(slug, filename):
    """The flush re-encode for an asset's original filename, or None."""
    name = filename[:-4] if filename.lower().endswith(".mp4") else filename
    if name.endswith("-flush"):  # covers / landings: same name, re-cropped
        master, src_slug = None, slug
        candidate = name
    elif " - " in name:
        src_slug, master = name.split(" - ", 1)
        src_slug = SLUG_ALIAS.get(src_slug, src_slug)
        candidate = f"{src_slug}-{master}-flush"
    else:  # e.g. "11-desktop-plp-badge.mp4", recorded without the slug prefix
        src_slug = slug
        candidate = f"{slug}-{name}-flush"
    path = FLUSH / DIRS.get(src_slug, src_slug) / f"{candidate}.mp4"
    return path if path.exists() else None


uploaded = {}


def upload(path, kind, ctype):
    if path in uploaded:
        return uploaded[path]
    if DRY:
        uploaded[path] = f"<new {kind[:-1]} {path.name}>"
    else:
        with open(path, "rb") as f:
            doc = req(f"{API}/assets/{kind}/{DATASET}?filename={urllib.parse.quote(path.name)}", f.read(), ctype, "POST")
        uploaded[path] = doc["document"]["_id"]
    return uploaded[path]


def walk(node, fn):
    if isinstance(node, dict):
        fn(node)
        for v in node.values():
            walk(v, fn)
    elif isinstance(node, list):
        for v in node:
            walk(v, fn)


def migrate_media(media, log):
    """Chapter / test media: panel + panelImage -> frame."""
    panel = media.pop("panel", None)
    image = media.pop("panelImage", None)
    if panel is None and image is None:
        return
    if media.get("type") == "phones" and not media.get("frame"):
        frame = {"_type": "mediaFrame", "colour": "none", "hex": PANEL_HEX, "fit": "auto"}
        if panel == "image" and image:
            frame.update(image=image, imageOpacity=55)
        media["frame"] = frame
        log.append(f"  phones panel {panel!r} -> frame hex {PANEL_HEX}{' + image 55%' if 'image' in frame else ''}")
    else:
        log.append(f"  legacy panel {panel!r} dropped (frame already set or not a phones row)")


def sweep(doc, files):
    slug = doc["slug"]["current"]
    log = []

    # 1. Zone 2 phones pair (Ali 11-02: one still, one video)
    if slug == "zone-2":
        still = FLUSH / "zone2/zone-2-05-mobile-pdp-still.jpg"
        clip = FLUSH / "zone2/zone-2-06-mobile-menu-plp-flush.mp4"
        gallery, out, done = doc.get("gallery") or [], [], False
        for item in gallery:
            fname = files.get(((item.get("video") or {}).get("asset") or {}).get("_ref", ""), "")
            if "05-mobile-pdp-image" in fname or "05-mobile-pdp-image" in str(item.get("video")):
                if not done:
                    out.append({"_key": secrets.token_hex(6), "_type": "galleryPhones", "phones": [
                        {"_key": secrets.token_hex(6), "_type": "phoneSlot", "type": "image",
                         "image": {"_type": "image", "asset": {"_type": "reference", "_ref": upload(still, "images", "image/jpeg")}}},
                        {"_key": secrets.token_hex(6), "_type": "phoneSlot", "type": "video",
                         "video": {"_type": "file", "asset": {"_type": "reference", "_ref": upload(clip, "files", "video/mp4")}}},
                    ]})
                    done = True
                continue
            if "06-mobile-menu-plp" in fname or "06-mobile-menu-plp" in str(item.get("video")):
                continue
            out.append(item)
        if done:
            doc["gallery"] = out
            log.append("  gallery 05 + 06 -> one phones row (PDP still + menu clip)")
    # 2. flush clips
    def swap(node):
        if node.get("_type") == "file" and isinstance(node.get("asset"), dict):
            ref = node["asset"].get("_ref")
            fname = files.get(ref)
            path = flush_file(slug, fname) if fname else None
            # Already the flush clip (a previous run uploaded it): nothing to do.
            if path and fname != path.name:
                new = upload(path, "files", "video/mp4")
                if new != ref:
                    node["asset"] = {"_type": "reference", "_ref": new}
                    log.append(f"  {fname} -> {path.relative_to(FLUSH)}")
    walk(doc, swap)

    # 3. backdrop fields -> frame
    backdrop = doc.pop("homeBackdrop", None)
    if backdrop and backdrop.get("asset"):
        cover = doc.setdefault("coverMedia", {})
        if cover.get("frame"):
            log.append("  homeBackdrop dropped (coverMedia.frame already set)")
        else:
            cover["frame"] = {"_type": "mediaFrame", "colour": "none", "image": backdrop, "imageOpacity": 60, "fit": "auto"}
            log.append("  homeBackdrop -> coverMedia.frame (image 60%)")
    for ch in doc.get("chapters") or []:
        if ch.get("media"):
            migrate_media(ch["media"], log)
        for t in ch.get("tests") or []:
            if t.get("media"):
                migrate_media(t["media"], log)

    return log


def main():
    projects = query('*[_type=="project" && !(_id in path("drafts.**"))]{_id, "slug": slug.current}')
    if ONLY:
        projects = [p for p in projects if p["slug"] == ONLY]
        if not projects:
            sys.exit(f"no project with slug {ONLY!r}")
    assets = query('*[_type=="sanity.fileAsset"]{_id, originalFilename}')
    files = {a["_id"]: a.get("originalFilename") or "" for a in assets}
    if TOKEN is None:
        print("no token: drafts not consulted, the plan is computed from the published documents\n")
    mutations = []
    for p in projects:
        pid = p["_id"]
        draft = None
        if TOKEN:
            got = req(f"{API}/data/doc/{DATASET}/drafts.{pid}")["documents"]
            draft = got[0] if got else None
        doc = draft or req(f"{API}/data/doc/{DATASET}/{pid}")["documents"][0]
        for k in ("_rev", "_createdAt", "_updatedAt"):
            doc.pop(k, None)
        doc["_id"] = f"drafts.{pid}"
        before = copy.deepcopy(doc)
        log = sweep(doc, files)
        # Only a document that differs from its source is written, so a
        # re-run neither re-logs nor rewrites a draft that is already done.
        changed = doc != before
        if changed and not log:
            log.append("  legacy fields unset")
        print(f"{doc['slug']['current']} ({'from draft' if draft else 'from published'}): {len(log)} changes")
        print("\n".join(log) if log else "  nothing to do")
        if changed:
            mutations.append({"createOrReplace": doc})
    if DRY:
        print(f"\nDRY RUN: {len(uploaded)} uploads, {len(mutations)} drafts would be written.")
        return
    res = req(f"{API}/data/mutate/{DATASET}", json.dumps({"mutations": mutations}).encode(), "application/json", "POST")
    print(f"\n{len(mutations)} drafts written, transaction {res.get('transactionId')}. Publish in the Studio after the code is merged.")


if __name__ == "__main__":
    main()
