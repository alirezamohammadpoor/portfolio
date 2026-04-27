# Portfolio — Handoff for Codex

A Next.js 16 portfolio site backed by Sanity Studio. Heavy GSAP animation, custom view-transition choreography, and a wheel-accumulation scroll model. The animation layer is where most regressions live — read the "Footguns" section before touching anything visual.

## Stack

- **Next.js 16.1** with App Router, Turbopack dev, React 19
- **Sanity** (embedded studio at `/studio`, content schema in `src/sanity/schemaTypes`)
- **Tailwind v4** (config in `src/styles/globals.css` via `@theme`; custom breakpoint `desktop: 75rem` / 1200px)
- **GSAP 3.14** + `@gsap/react` (`useGSAP`), **SplitText**, **ScrollTrigger**
- **Lenis** for smooth scroll
- **next-view-transitions** for cross-route shared-element morphs
- TypeScript strict, ESLint (config currently broken — `npx eslint` errors with a circular JSON; rely on `npx tsc --noEmit`)

`bun` lockfile is committed; dev script is `portless portfolio next dev --turbopack`.

## Routes

- `/` — home gallery (`src/app/(site)/page.tsx` → `HomeGallery`)
- `/project/[slug]` — project detail (`ProjectPageClient` → `ProjectInfoPanel` + `ProjectGallery` + `Footer`)
- `/about` — `AboutContent` with portrait, bio, social links, Spotify widget
- `/journal`, `/journal/[slug]` — long-form posts with PortableText
- `/studio/[[...tool]]` — embedded Sanity Studio

API routes: `/api/spotify/now-playing`, `/api/draft-mode/enable`, `/api/revalidate`.

## Key components & flows

### TransitionContext (`src/context/TransitionContext.tsx`)
Owns the home→project "clone" morph. The home gallery captures the clicked thumbnail, holds it in a fixed clone element, and morphs it to the destination's first gallery item using `getBoundingClientRect`. `isTransitioning` gates a lot of downstream behavior — when true, ProjectGallery renders `invisible`, ProjectInfoPanel skips entrance animations, etc.

### useGalleryScroll (`src/hooks/useGalleryScroll.ts`)
The core of the project page. Locks scroll on mount for 2s while the clone settles, then unlocks. Tracks scroll progress (0–100), shows next/prev hint text at edges, and on **desktop only** uses wheel-accumulation: hitting the bottom edge accumulates `deltaY` until `THRESHOLD = 2500`, then triggers `routerPush(next)`. Mobile uses a dedicated nav row in the footer instead.

Scroll lock release on unmount is critical — without `unlockScroll()` in cleanup, navigating away during the 2s window leaves scroll permanently frozen on subsequent pages. (Fixed in `dd1edab`, do not remove.)

### useTextAnimation (`src/hooks/useTextAnimation.ts`)
Three flavors of GSAP SplitText entrance:
- `useTitleAnimation` — chars drop from above with mask
- `useBodyAnimation` — lines slide up with mask
- `useInlineAnimation(ref, scope, selector, opts)` — runs SplitText on each match of `selector` inside `ref`

Each call site picks its own selector. For example `AboutContent` uses `"[data-animate], a"`, while `ProjectInfoPanel` uses `"a:not([data-pill])"`. **The selector decides what gets sliced into line-masks.** This matters because SplitText injects DOM that React doesn't know about (see Footguns).

### ProjectGallery (`src/components/project/ProjectGallery.tsx`)
Renders `gallery[]` from Sanity (each item is `galleryImage` or `galleryVideo`). Videos are `autoPlay muted loop playsInline preload="metadata"`. An IntersectionObserver pauses offscreen videos and plays in-view ones. Two recovery layers exist for mobile autoplay-blocked cases:
1. `canplay` listener retries `play()` when data arrives
2. An effect keyed on `isTransitioning` retries paused in-view videos when the clone transition ends

The first item gets a special ref (`firstImageRef`) and an `onLoad`/`onLoadedMetadata` callback (`onFirstReady`) that triggers the clone morph.

### CopyButton (`src/components/CopyButton.tsx`)
Used for email (About) and per-project Shopify password (Footer + ProjectInfoPanel). Has separate desktop and mobile feedback:
- **Desktop**: floating tooltip pill above the button, hover shows "Click to copy", flips to "Copied" on click
- **Mobile**: inline label swap — button text fades from `Email`/`Password` to `Copied` with a pistachio pill painted behind it

The pill is a sibling of the button (in the wrapper span), not a child, so SplitText running inside the button can't clip it. The label and the "Copied" overlay are separate cross-fading elements; only the static label carries `data-animate` so SplitText's mask DOM stays valid across `copied` state changes.

## Footguns

**1. SplitText vs. React re-renders.** `SplitText.create(el, { mask: "lines" })` mutates the DOM under React's nose. It wraps text nodes in `<div class="line">` masks with `overflow: hidden`. If React then re-renders that text (because some prop or state changed), it tries to update text nodes that are now inside SplitText's wrappers — resulting in clipped text, broken positioning, or DOM that React can't reconcile. **Rule:** don't put `data-animate` (or whatever your SplitText selector matches) on an element whose text content swaps based on state. Animate a static-text inner span instead, and put dynamic content in a separate sibling. CopyButton went through three regressions before this was understood — see commits `649c89f`, `e93a2ff`, `69b23e0`.

**2. Mobile video autoplay after a view transition.** When you tap a `<Link>` in `next-view-transitions`, the outgoing page's click consumes user activation. The new page's `<video autoPlay>` can be silently blocked because activation didn't carry through. Symptoms: gallery videos frozen on poster after Next/Previous, or first video stuck after home→project. The fix in ProjectGallery uses three layers (observer, `canplay`, transition-end retry); don't rip any of them out.

**3. CopyButton wrapper alignment is fragile across flex contexts.** The component is dropped into `items-baseline` rows (About, ProjectInfoPanel) AND `items-center` rows (project Footer). The wrapper is `inline-flex items-center` so its box height matches plain `<a>`/`<button>` siblings in both. Don't change it to `inline-block` without testing both rows — a previous fix that targeted only the baseline case quietly regressed the centered case for a week.

**4. The 2-second scroll-lock window on project page mount.** During this window, Lenis is stopped and scroll is locked. If you add new code that runs on project page mount, don't assume scroll works. If you `routerPush` away from a project page within those 2 seconds, the cleanup must release the lock or scroll dies on the next page.

**5. `isTransitioning` is a tri-state-ish prop.** It's a boolean, but the meaningful states are: (a) initial mount with transition queued, (b) animating the clone, (c) settled. Code keyed on `!isTransitioning` runs both during initial render-before-transition AND after the transition completes. Don't use it as a "did the transition just end" signal — use a separate `useEffect([isTransitioning])` and check inside.

**6. View transitions on mobile.** `next-view-transitions` falls back to a CSS slide on mobile (TransitionProvider toggles `data-custom-clone` on `<html>` to disable the slide for the home→project clone path only). When debugging mobile-only nav glitches, check whether the slide and the clone are racing.

**7. ESLint config.** `npx eslint .` currently throws a circular JSON error inside `@eslint/eslintrc`. Pre-existing. `npx tsc --noEmit` is the reliable lint gate; CI uses `next build` which catches TS errors but skips ESLint. Fix or replace the eslint config if you need linting.

**8. Sanity types.** `src/sanity/types.ts` is generated by `bun typegen`. Don't hand-edit. After schema changes, run `bun typegen` (or `npm run typegen`) and commit the result.

**9. GSAP cleanup.** `useGSAP` auto-cleans tweens via gsap.context, but `ScrollTrigger.create` instances need explicit cleanup if added outside a `useGSAP` scope. Several past bugs traced to ScrollTriggers leaking across navigations.

## Common tasks

- **Add a project**: create in Studio at `/studio` under "Project". Set `order` (controls home gallery and next/prev cycle), upload `coverMedia` and `gallery[]` items. Optional `siteUrl` + `sitePassword` show in the project footer; optional `caseStudy` ref links to a journal post.
- **Schema changes**: edit `src/sanity/schemaTypes/`, then `bun typegen`.
- **Style tokens**: `src/styles/globals.css` `@theme` block. Custom breakpoint is `desktop: 75rem`.
- **Debugging animations**: GSAP DevTools isn't installed. Most useful debug: comment out `mask: "lines"` on the relevant SplitText call to see if a clipping issue is mask-related.

## Memory / preferences (Ali's rules)

- **Never add `Co-Authored-By` to commit messages.** Applies to every repo.
- **Never commit or push without explicit instruction.** Even in auto mode, even when typecheck passes. Make the change, report it, wait.

These are recorded in the user's local Claude memory (`~/.claude/projects/.../memory/`) but Codex won't see them automatically — be aware.

## Recent commits worth knowing

- `5ab5e19` — first-video-after-home→project recovery (latest)
- `69b23e0` — CopyButton restructure: pill out of button, label data-animate moved to inner span
- `e93a2ff` — CopyButton inline mobile swap (replaced floating "Copied" pill)
- `8f489d6` — mobile copy feedback + video canplay fallback + footer password alignment
- `649c89f` — original CopyButton CLS fix (also the source of three subsequent regressions)
- `5c3088d` — page-slide transition + autoplay gallery videos + the original `leading-[0]` password alignment fix that 649c89f undid
- `dd1edab` — scroll lock release on unmount (do not revert)
