One-off content seed: the Stronger draft with four chapters (chapter page, PR #36).
Run from the Mac, where .env.local holds the write-scoped Sanity token:

    cd ~/Developer/portfolio && TOKEN=$(grep '^SANITY_API_READ_TOKEN=' .env.local | cut -d= -f2- | tr -d '"') && \
    curl -sS -X POST "https://v3d28bxo.api.sanity.io/v2025-01-01/data/mutate/production" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      --data-binary @seed/stronger-chapters.mutation.json

It writes drafts.project-stronger only; publish from the Studio after reading.

## v3 (2026-10-29): lanes, five chapters + test switcher

    cd ~/Developer/portfolio && python3 seed/seed-stronger-v2.py

Uploads the Figma exports in seed/stronger-figma/ as image assets (idempotent, matched by sha1),
reads the published Stronger document and writes drafts.project-stronger with the eight chapters
from seed/stronger-chapters-v2.json. `--dry-run` prints the document without a token.
Then read the draft in the Studio and Publish.

## v4 (29 Oct, feat/test-story)

- `abTest` gained `hypothesis`, `metric`, `result`, `decision`; the badge test carries the 29 Oct GrowthBook snapshot (64,222 users).
- `media.video` and `media.poster` accept `file:<name>` and upload from `seed/stronger-media/` (mp4, jpg) the same way images upload from `seed/stronger-figma/`.
- `stronger-media/10-mobile-plp-badge-390.mp4` is the production badge capture cropped to the phone (780x1634, 0.6 MB, crop=778:1630:890:174 of the 2560x1920 master) with its first frame as poster.
