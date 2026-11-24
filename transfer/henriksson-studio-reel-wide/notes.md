# Henriksson Studio reel, landscape laptop stills (24 Nov 2026)

A new site going from the booking system to live, as a landscape laptop window. Viewport-only PNGs (no full-page),
locale sv-SE, Europe/Stockholm. Local demo only: localhost:3210 on the `recording` dataset with the scale-demo booking
feed. Every run checked each Sanity data call; only `recording` was used. Production and Vercel were not touched.

- `*@1280x800.png`: 1280x800 CSS px at deviceScaleFactor 3 (3840x2400).
- `*@1024x640.png`: 1024x640 CSS px at deviceScaleFactor 4 (4096x2560).
- `rects-<WxH>.json`: per file the viewport, dsf, URL, time, window scroll, every pane (index, title, CSS-px rect,
  collapsed or not, and each scroller's scrollTop), the control pressed next (`next`) and the notice, badge or row
  that changed (`notice`). All rects are CSS px; multiply by the dsf for image px.
- `state.json`: per size, the seconds per phase, AI texts, schedule result and the datasets seen.
- `probe/`: To do alone (a), To do + Site view (b), site page document open (c) at 1440x900, 1280x800, 1152x720,
  1024x640, 960x600 and 900x562, dsf 1; `probe/panes.json` has the panes per shot.

## What the Studio shows (pane widths in CSS px)

| Situation | 1440x900 | 1280x800 | 1152x720 | 1024x640 | 960x600 | 900x562 |
|---|---|---|---|---|---|---|
| To do alone | Content 350, To do 1089 | Content 350, To do 929 | Content 350, To do 801 | Content 350, To do 673 | Content 350, To do 609 | Content 350, To do 549 |
| + Site view | Content 350, To do 544, Site 544 | 350 / 464 / 464 | 350 / 400 / 400 | 341 / 341 / 341 | 320 / 320 / 320 | Content strip, To do 424, Site 424 |
| + site page doc | Content strip, To do 320, Site 320, doc 746 | Content + To do strips, Site 336, doc 839 | strips, Site 320, doc 727 | strips, Site 320, doc 599 | Content, To do, Site strips, doc 804 | same, doc 744 |

A strip is a collapsed pane, 51 px wide with its title written vertically. The Content list stays open beside To do
at every size.

In the two full runs:
- 01-03 and 08a-09h: Content list + To do at full width (929 at 1280, 673 at 1024).
- 04, 07a-07e, 09i: Content + To do + Site side by side (1280: 350/464/464; 1024: three equal 341 columns).
- 05a-06d: Content and To do collapse to strips; Site (336 at 1280, 320 at 1024) + the document (839 at 1280,
  599 at 1024). 06 is the Site document (photos), 05 the site page document.
- 08a: after 07e the flow goes back to To do alone by clicking "To do" in the Content list (as a person would);
  the Site pane closes and To do takes the full width.
- 10a: the live site page at the same viewport (no Studio panes).

## Files
01 To do before sync · 02 after Sync now (summary notice) · 02b New from booking list · 03a the Skellefteå row while
adding ("Writing texts…") · 03 "1 site added, with AI texts" · 04 Site view · 05a/b/c site page top, AI intro, AI
About · 06a Images empty · 06c photo uploaded (image dialog) · 06d two photos · 07a site ready · 07b release menu ·
07c New release dialog · 07d named "Skellefteå launch" · 07e "In the release" (Site pane notice) · 08a Releases tab ·
09a/b schedule input empty/filled · 09c schedule refused · 09e before Publish · 09f confirm · 09g "Skellefteå launch is
live." · 09h Published tab · 09i site Live badge · 10a live page top.

## What did not work, and fixes
- Scheduling is refused by Sanity on this project ("active release count exceeds the limit of 0"); 09c shows the red
  card. After pressing Schedule the card briefly shows an optimistic "Scheduled 16:06 · Unschedule · Publish now"
  before the refusal comes back; I checked on a fresh load that nothing was scheduled, and 09c waits until the card
  is back to Schedule…/Publish. The release was then published with Publish (09e-09i).
- The first 1024 attempt was refused client-side with "Pick a time at least a few minutes from now": the time was
  3 min ahead and the dsf-4 shots used it up. The lead is now 6 min. Nothing was scheduled; that run was redone from
  Reset demo.
- The first 1280 attempt opened "Add to release…" in the To do pane's Sites row instead of the Site pane's button;
  fixed and redone from Reset demo. Both final runs are complete runs from Reset demo.
- Photos are the Malmö fixture photos without alt text, so the Studio lists them as "Untitled".
- When To do is a narrow column (Site view open), its Unit type rows wrap "22 d ago" over three lines.

## Timings
- 1280x800: 158 s from Reset demo to the live page. Sync about 1 s, Add with AI texts 9 s, Publish 4 s.
- 1024x640: 360 s. Sync about 1 s, Add with AI texts 8 s; the schedule refusal took about 100 s to come back and
  Publish took 108 s (Sanity was slow at that moment).

The demo is left as the flow ends: Skellefteå live, Luleå waiting under New from booking. The dev server on :3210 is
stopped.
