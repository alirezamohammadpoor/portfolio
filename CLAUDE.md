@AGENTS.md

# Stack

Next 16.3 (App Router, Turbopack) + React 19, Sanity v5 (Studio at `/studio`), GSAP, Lenis, Tailwind v4. Package manager is bun. Live at alirezamp.com on Vercel; every pushed branch gets a Vercel preview build.

- `bun run dev` (via portless) or `bun run dev:plain`. A fresh worktree needs `.env.local` (see `.env.local.example`).
- `bun run typegen` after any schema change.
- There is no test suite. The gate before a PR is `bun run lint`, `bunx tsc --noEmit` and `bun run build`, all clean.

# Where things are

- `src/app/(site)`: home (scatter entry), `project/[slug]` (gallery page), `journal`, `about`. `lab/*` routes are prototypes, not linked from the site.
- `src/components/layout/Header.tsx`: the capsule bar (Work and About panels in `layout/bar/`); `lab/bar` holds its prototypes.
- Navigation: `TransitionOverlay` morphs the home cover into the project page; `src/lib/viewTransitions.tsx` runs root view transitions on links the site starts (back and forward stay plain).
- Next 16 keeps visited pages mounted but hidden (Activity): state survives navigation and effects re-run, so clean up timers, observers and GSAP contexts.
- `src/lib/landing.ts` `CHAPTER_PAGE` parks the chapter page; project chapters live in journal case studies.

# How we work

- Mock first, no design shortcuts. Figma covers laptop and mobile breakpoints only. Transition and layout ideas start as a prototype under `/lab` (Emil's `/prototype` skill).
- Verify on localhost or the branch's Vercel preview before opening a PR. After each push, look up the branch's preview deployment (Vercel project `portfolio`) and send its URL and the page path to check. Merge only when Ali says so.
- Copy: plain English about what was done. No dates and no metrics. Lead with the craft (design system, editor and content blocks, UX, performance).
- Do not name a client whose permission is not confirmed, in copy or in committed files. The role line is "intern at TRY".

# Commits and pull requests

- Commit messages carry no AI attribution: no `Co-Authored-By`, `Claude-Session` or similar trailers. Author and committer are the repo owner's git identity.
- Pull request descriptions carry no "Generated with Claude Code" footer or session links.
- Do not post comments or reviews on pull requests or issues; report in the conversation instead.
