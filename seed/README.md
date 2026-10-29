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
