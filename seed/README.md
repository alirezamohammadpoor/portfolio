One-off content seed: the Stronger draft with four chapters (chapter page, PR #36).
Run from the Mac, where .env.local holds the write-scoped Sanity token:

    cd ~/Developer/portfolio && TOKEN=$(grep '^SANITY_API_READ_TOKEN=' .env.local | cut -d= -f2- | tr -d '"') && \
    curl -sS -X POST "https://v3d28bxo.api.sanity.io/v2025-01-01/data/mutate/production" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      --data-binary @seed/stronger-chapters.mutation.json

It writes drafts.project-stronger only; publish from the Studio after reading.
