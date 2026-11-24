# Henriksson Studio reel stills (24 Nov 2026)

Stills of a new site going from the booking system to live, one Studio pane per shot. Each is a PNG at
390x844 CSS px with deviceScaleFactor 4 (1560x3376), Europe/Stockholm. Most states also have an `@540x675`
version (2160x2700). Local demo only: localhost:3210 on the `recording` dataset with BOOKING_SOURCE=scale-demo
(`start-demo.sh`). The capture stops if the Studio calls any other dataset. Production was not touched.

- `capture.js`: the capture script. `node capture.js` runs phases 1-10; `node capture.js 9p,10` runs a list of phases.
- `rects.json`: for each file, the viewport, scroll, URL and time, plus CSS-px rects of the button pressed next
  (`next`) and the notice or badge that changed (`notice`).
- `state.json`: Studio URLs, the AI texts and timings.
- `probe/`: the To do page at 390, 540 and 1440, from the narrow-width check.

## Narrow widths
At 390x844 and 540x675 the structure tool shows one pane at a time, with a back arrow and the pane title in the
header. At 1440x900 it shows columns. At 390 the To do rows (Unit types, release rows) overflow on the right
and "Add to release…" gets cut off; at 540 they fit. In-pane notices are cards, not toasts.

## Scheduling
It does not work on this project. Schedule… opens an inline date/time input on the release card (09a, 09b), and
pressing Schedule shows a red card: "active release count exceeds the limit of 0" (09c, 09d). Sanity's plan
allows no Content Releases or scheduled drafts. The release was published with Publish instead (09e-09i). In
code, a scheduled release shows a static "Scheduled <date time>" badge, an "Unschedule" button and "Publish now"
(no countdown), and once live it shows under Published as "Went live as scheduled …". I could not capture those
states.

## Files
01 To do before sync · 02 after Sync now (summary notice) · 02b New from booking list · 03a Adding (row while
adding) · 03 "1 site added, with AI texts" · 04 site view: Before it goes live + Documents · 05a/b/c site page:
top, AI intro, AI About · 06a Images empty · 06b image dialog · 06c photo uploaded · 06d two photos · 07a site
ready · 07b release menu · 07c New release dialog · 07d named "Skellefteå launch" · 07e "In the release" · 08a
Releases tab · 09a/b schedule input · 09c/d schedule refused · 09e before Publish · 09f confirm · 09g "Skellefteå
launch is live." · 09h Published tab · 09i site Live badge · 10a live page top · 10b live page full · 10c store
finder (/se/sv/hitta-forrad) at Västerbottens län.

## Caveats
- Photos: the 11-09 Malmö fixture photos (`../studio-v3/_src/`). They have no alt text, so the Studio shows "Untitled".
- The town page /se/sv/forrad-att-hyra/skelleftea is not in the release and returns 404. Because of that the
  store finder still lists Skellefteå as "Öppnar snart".
- 10b is 1560 px wide and very tall (12.7 MB).
- Timing: Reset to release card (phases 1-8) takes about 2 min 45 s; Publish and the live site take about 1 min;
  the full run is about 4 min. Sync took about 10 s and Add with AI texts about 10 s.
- The demo is left as the flow ends: Skellefteå live, Luleå waiting under New from booking. The dev server is still
  running on :3210 (stop it with Ctrl-C or `pkill -f "next dev -p 3210"`).
