# Henriksson Studio v3: "editor launches a new site alone" (raw capture, 9 Nov 2026)

Recorded with `_tools/hrec3.js` (deterministic 60 fps, 1440x900 @2x, tap dot only, no captions), scene
`_tools/scenes/henriksson/v3-studio-editor-alone.js`. Dev server localhost:3210 on the `recording` dataset with
BOOKING_SOURCE=scale-demo. Production was not touched. Waits (sync, add, uploads, publish) are hard cuts.

## Video
- `studio-v3-editor-launches-site.mp4`: master, 2880x1800, 60 fps, H.264 CRF 16, 62.2 s.
- `studio-v3-editor-launches-site-web.mp4`: web encode, 1440x900, ~1.5 MB.
- `studio-v3-editor-launches-site-poster.jpg`: end frame.

Each state has a ~2 s hold, with the still taken at its midpoint. The flow:
empty inbox, then Sync now, then Skellefteå waiting, then Add, then the site pane, then the draft editor. In the
editor the AI intro gets " Öppet 05–00 alla dagar." typed on the end, and a third About paragraph is added. Then the
Site doc, where two photos are uploaded, then New release "Skellefteå launch", the Releases tab, Publish, Published,
and the live page with a scroll down.

## Stills (`stills/`, PNG 2880x1800)
| File | State |
|---|---|
| 01-todo-inbox-empty.png | To do, In progress tab after Reset demo: nothing new from booking (empty inbox) |
| 02-todo-inbox-site-waiting.png | After Sync now: New from booking (2) with Skellefteå and Luleå waiting (filled inbox) |
| 03-todo-site-added.png | Skellefteå added: "1 site added, with AI texts", Sites step 1 In progress |
| 04-site-pane-checklist.png | Site pane: Before it goes live checklist, Add to release…, Documents |
| 05-draft-site-page-editor.png | Draft site page editor (Draft badge, title, URL path, booking facts) |
| 06-draft-texts-edited.png | About text with the AI paragraphs plus the one typed in |
| 07-site-photos-added.png | Site doc Images field with two uploaded photos; checklist shows Own photos ✓ |
| 08-site-in-release.png | Site pane: "In the release Skellefteå launch" |
| 09-release-list.png | Releases tab: Skellefteå launch card (Add: Site, Site page), Publish / Schedule |
| 10-release-published.png | Published tab: Skellefteå launch went live; site and page show Live |
| 11-live-site-page.png | localhost:3210/se/sv/forrad-att-hyra/skelleftea/hantverkarvagen-133 hero with the uploaded photo and edited intro |
| 12-live-site-page-about.png | Same page scrolled to the unit cards |

## Caveats
- The two "Skellefteå" photos are Henriksson's Malmö fixture photos (`_src/`), resized to 1800 px.
- The photos have no alt text, so the editor shows "Untitled" for them.
- The editor's "Edited in N min" timestamps are odd because the page clock is virtual during recording.
- Luleå stays waiting in New from booking throughout.
- The demo was reset again after capture, so the recording dataset is clean.
