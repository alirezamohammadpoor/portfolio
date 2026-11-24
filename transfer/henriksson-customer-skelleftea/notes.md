# Skellefteå customer booking stills (24 Nov 2026)

A customer books the smallest unit (7 m²) at the new Skellefteå site, Hantverkarvägen 133, on a phone. This continues
the Studio reel, which ends on this page. All PNGs are 390x844 CSS px at deviceScaleFactor 4 (1560x3376) with isMobile
and hasTouch, sv-SE, Europe/Stockholm, Chrome headless. Local demo only: localhost:3210, `recording` dataset
(start-demo.sh). The capture stops if anything calls another dataset, and nothing did. Content was not changed.
Skellefteå is still live.

`rects.json` holds, per file: viewport, URL, scrollY, time, `next` (the control pressed next, CSS px), the sticky
header and bottom bar rects, and in drawer states the drawer panel rect plus its scroller (rect, scrollTop,
scrollHeight). Multiply CSS px by 4 to get PNG px.

## Files
- p01-site-top: the page at the top. Sticky header (80 px) and sticky price bar at the bottom ("Från 745 kr/mån · 7 m²", BOKA NU).
- p02-site-full: the whole page, 1560x30888 (7722 CSS px). **The sticky header and the bottom bar are hidden in this
  one** (display:none). The header takes 80 px in the page flow, so this page is 80 px shorter than the real one and
  starts with the hero. It is stitched from 3000 px segments, because Chrome repeats content in a single screenshot
  this tall at 4x (over its 16384 px limit). The same limit probably also broke the earlier `10b-live-full`.
- p02-header, p02-bottombar: the two sticky bars on their own at scrollY 1200 (header 0,0,390x80; bar 0,768,390x76).
- p03-units: "Lediga förråd i Skellefteå" just under the header, scrollY 558.
- p04-unit-card: the 7 m² card with its "Boka 7 m²" button in view, scrollY 710 (`next` = that button).
- p05a-drawer-opening: the drawer halfway up its slide (panel top at y 351). The transition was slowed 100x
  through CDP to catch the frame.
- p05-drawer-open: the drawer at rest. It shows the navy header (Ditt förråd · Skellefteå, 7 m², B 2,3 × D 3 × H 2,4 m,
  Byt storlek, ✕), "1 När vill du flytta in?" (Idag · 24 november 2026, Ändra datum ↓) and "2 Försäkring" (10 000 kr INGÅR,
  preselected), with the price footer (Att betala vid inflyttning 745 kr, FORTSÄTT TILL BETALNING →).
- p06-size-picker: Byt storlek opens a bottom sheet over the drawer with 7 m² (Vald), 14 m² and 28 m². It was closed
  again without a change.
- p07-move-in-date: Ändra datum opens a date field showing 2026-11-24, the default. It was closed again and the date was not changed.
- p08-insurance: the drawer scrolled to "2 Försäkring för ditt förråd", with 10 000 kr (INGÅR) still selected. Scroller scrollTop 111.
- p09-details-continue: the last screen before payment. "3 Dina uppgifter" with empty Namn / E-post / Mobilnummer
  fields and the continue button (`next`, NOT pressed). Scroller scrollTop 171 (bottom).
- p09-drawer-full: the same drawer with the viewport made 1015 px tall (1560x4060) so all of its content shows at once.

## How the flow works on the phone
- The price bar is fixed to the bottom of every scroll position. Its BOKA NU and each card's "Boka <size>" open the same
  drawer for that unit. The cheapest unit is the 7 m², so both open the same drawer here.
- The drawer is a full-screen sheet. It slides up from the bottom (translate-y 100% → 0, 300 ms,
  cubic-bezier(0.32,0.72,0,1)) while a navy/40 scrim fades in. The bottom bar hides while the drawer is open. Inside
  the drawer, the navy header and the price footer stay put and only the step body scrolls (761 px of content in a
  590 px scroller).
- Steps 1 (date), 2 (insurance) and 3 (details) are all on one screen. "Fortsätt till betalning" goes on to a payment
  step that is a demo (nothing is sent anywhere, per the code). It was not pressed, and no personal details were typed.
- Byt storlek opens a second bottom sheet over the drawer. Choosing a size keeps the date, insurance and fields.

## Caveats
- The site ran from the working tree on `local/sheet-motion`, which has uncommitted sheet-motion changes
  (drawer and size-picker exit animations). The stills show that version.
- Hidden in every still: Next's dev indicator and the Cookiebot banner (the banner did not appear anyway).
- External requests were only Sanity (`recording` dataset, CDN images), Cookiebot and nothing else. No non-GET call left localhost.
- "Perfekta förråd för…" shows grey text placeholders where its images go, and the map block is a navy panel. That
  is the page's own content on this dataset.
- In drawer states `headerBehindDrawer` is the page header under the sheet, not visible.
