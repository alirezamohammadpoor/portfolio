#!/usr/bin/env python3
"""Seed the Henriksson case as a DRAFT project (Ali, 11-03 pilot).

Uploads the Loops v2 clips + posters and writes drafts.project-henriksson
with the chapter page: statements between chapters, the Figma loop, the
Studio carousel, and bento pairs for booking and the store finder. Copy is
from the hiring-funnel doc ("Copy drafts" > Henriksson), with numbers taken
out of chapter 1. Never publishes: the real brand shows, so it stays a draft
until Henriksson's permission is confirmed.

Usage:
  SANITY_API_WRITE_TOKEN=... python3 scripts/sanity/seed-henriksson.py [--dry-run] [--loops DIR]
DIR defaults to /mnt/project-files/henriksson-videos/loops (L1.mp4, L2-figma.mp4, L3d.mp4, L4a..L5d.mp4 + -poster.jpg).
"""
import json, os, sys, secrets, urllib.parse, urllib.request
from pathlib import Path

PROJECT, DATASET, API_V = "v3d28bxo", "production", "v2025-01-01"
API = f"https://{PROJECT}.api.sanity.io/{API_V}"
DRY = "--dry-run" in sys.argv
LOOPS = Path(sys.argv[sys.argv.index("--loops") + 1]) if "--loops" in sys.argv else Path("/mnt/project-files/henriksson-videos/loops")
TOKEN = os.environ.get("SANITY_API_WRITE_TOKEN") or os.environ.get("SANITY_API_TOKEN")
if not DRY and not TOKEN:
    sys.exit("Set SANITY_API_WRITE_TOKEN (Editor token for v3d28bxo), or run with --dry-run.")

key = lambda: secrets.token_hex(6)


def req(url, data=None, ctype=None):
    r = urllib.request.Request(url, data=data, method="POST" if data is not None else "GET")
    if TOKEN:
        r.add_header("Authorization", f"Bearer {TOKEN}")
    if ctype:
        r.add_header("Content-Type", ctype)
    with urllib.request.urlopen(r) as resp:
        return json.load(resp)


def upload(name, kind):
    path = LOOPS / name
    if not path.exists():
        sys.exit(f"missing {path}")
    if DRY:
        return f"<{kind} {name}>"
    ctype = "video/mp4" if name.endswith(".mp4") else "image/jpeg"
    with open(path, "rb") as f:
        doc = req(f"{API}/assets/{kind}/{DATASET}?filename={urllib.parse.quote('henriksson-' + name)}", f.read(), ctype)
    print("  uploaded", name)
    return doc["document"]["_id"]


def ref(kind, _id):
    return {"_type": kind, "asset": {"_type": "reference", "_ref": _id}}


def clip(loop):
    """file + poster for a loop id like 'L4a' or 'L2-figma'."""
    return ref("file", upload(f"{loop}.mp4", "files")), ref("image", upload(f"{loop}-poster.jpg", "images"))


def tile(loop, device, label=None):
    video, poster = clip(loop)
    t = {"_key": key(), "_type": "tile", "type": "video", "device": device, "video": video, "poster": poster}
    if label:
        t.update(_type="slide", label=label)
    return t


def para(text, bold=None):
    children = []
    if bold:
        children.append({"_type": "span", "_key": key(), "text": bold, "marks": ["strong"]})
    children.append({"_type": "span", "_key": key(), "text": text, "marks": []})
    return {"_type": "block", "_key": key(), "style": "normal", "markDefs": [], "children": children}


def statement(text, subtext=None):
    s = {"_key": key(), "_type": "statement", "text": text}
    if subtext:
        s["subtext"] = subtext
    return s


def chapter(title, paragraphs, media=None, layout="full"):
    c = {"_key": key(), "_type": "chapter", "title": title, "text": paragraphs, "layout": layout, "side": "right"}
    if media:
        c["media"] = media
    return c


def main():
    cover_video, cover_poster = clip("L1")
    l2_video, l2_poster = clip("L2-figma")

    chapters = [
        statement("Instead of a pitch deck, a site they could click through."),
        chapter("Built to grow across countries", [
            para("Henriksson Storage runs a chain of self-storage sites in Sweden and the UK and is opening in Germany. To keep growing across countries and sites, they wanted a new stack and architecture. Their site is Framer with custom React, and every new facility needs a developer to copy a page by hand."),
            para("They asked for three things: pages that come from the booking system, marketing edits without developers, and a move that keeps their search rankings. Instead of a pitch deck, I built a proof of concept using Next.js and Sanity."),
        ]),
        chapter("Their site, in Figma, first", [
            para("I started by recreating their live site in Figma, page for page, on laptop and mobile, so the client would see their own brand inside the new system. Then I turned that file into a design system set up to TRY Stockholm's standard: a style guide, shared colour and type tokens, and one page per component. That meant a senior designer and I could start on UX improvements straight away, instead of redrawing the site first."),
        ], {"type": "video", "video": l2_video, "poster": l2_poster}),
        statement("What happens when a new facility appears in the booking system?"),
        chapter("The booking feed is the site", [
            para("That question shaped every decision. Facts and prices stay read-only in the CMS. New facilities sync in as draft pages with drafted copy; marketing reviews and publishes. A \"To do\" page in the Studio (booking inbox, in progress, releases, published) turns the CMS into a workflow for editors."),
        ], {"type": "carousel", "slides": [tile("L3d", "laptop", "Live")]}),
        statement("Fewer steps between choosing a unit and paying for it."),
        chapter("Booking, made easier", [
            para("Each facility page now shows one set of prices, and on a phone the first price sits near the top of the screen instead of several scrolls down. On the live site, the book button sends the visitor off to a separate checkout. In the rebuild, booking opens in a modal over the page, so the visitor never loses the facility they were looking at."),
            para("The modal confirms the chosen unit at the top, and if it is the wrong size the visitor can switch sizes right there, keeping everything they have already filled in. The form asks only for a name, an email and a phone number, then a start date and insurance level, with the total next to the button. On desktop the same flow opens as a side panel next to the page."),
        ], {"type": "bento", "rows": [
            {"_key": key(), "_type": "bentoRow", "tiles": [tile("L4a", "phone"), tile("L4b", "laptop")]},
            {"_key": key(), "_type": "bentoRow", "tiles": [tile("L4c", "phone"), tile("L4d", "laptop")]},
        ]}),
        chapter("A store finder that starts with the nearest facility", [
            para("Finding a storage unit near you should take the first few seconds on the site, whether you land on the homepage or on the store finder page I built. Visitors search by town, address or postcode and see the nearest facilities first. On desktop they sit on a map that groups nearby sites together; on a phone the list slides up from the bottom of the screen. Results appear as you type."),
            para("Picking a facility keeps the visitor where they are: the map switches to that facility's storage units, and they can book straight from there. The full facility page is one tap away for anyone who wants to read more, but nobody has to go through it to book."),
        ], {"type": "bento", "rows": [
            {"_key": key(), "_type": "bentoRow", "tiles": [tile("L5a", "laptop"), tile("L5b", "phone")]},
            {"_key": key(), "_type": "bentoRow", "tiles": [tile("L5c", "laptop"), tile("L5d", "phone")]},
        ]}),
        statement("A working product beats slides."),
        chapter("What I took from it", [
            para("The client passed on the pitch. What I kept:"),
            para(" with the booking system as the source and editors publishing without a developer.", "How to set up Next.js and Sanity for many sites,"),
            para(" worked through with a senior designer.", "UX improvements and a shorter booking funnel,"),
            para(" Recreating a live site and turning it into a design system became a skill I now reuse.", "A repeatable Figma start."),
            para(" from the first meeting to the demo.", "How an agency pitch is sold,"),
        ]),
    ]

    doc = {
        "_id": "drafts.project-henriksson",
        "_type": "project",
        "title": "Henriksson",
        "slug": {"_type": "slug", "current": "henriksson"},
        "shortDescription": "Proof of concept for a pitch to a self-storage chain: UX improvements to the booking path, a design system set up in Figma, and a custom Sanity workflow on Next.js.",
        "fullDescription": [para("Only builder on TRY's pitch team. I directed every design, code and content session, reviewed and merged all of it, and ran the live demo at both client meetings.")],
        "techStack": ["Next.js", "Sanity", "Figma"],
        "order": 0,
        "coverMedia": {"type": "video", "video": cover_video, "image": cover_poster},
        "gallery": [{"_key": key(), "_type": "galleryVideo", "video": cover_video}],
        "chapters": chapters,
    }

    if DRY:
        print(json.dumps(doc, indent=1)[:4000])
        print(f"\nDRY RUN: {sum(1 for _ in LOOPS.glob('*.mp4'))} clips in {LOOPS}; would write drafts.project-henriksson with {len(chapters)} blocks.")
        return
    res = req(f"{API}/data/mutate/{DATASET}?returnIds=true", json.dumps({"mutations": [{"createOrReplace": doc}]}).encode(), "application/json")
    print(f"draft written: drafts.project-henriksson, transaction {res.get('transactionId')}. Do NOT publish until permission is confirmed.")


main()
