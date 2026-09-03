# BingeWatcher — Agent Handoff

Keep this file current after every meaningful decision, implementation milestone, or scope change. Read it before starting work; do not invent decisions where it says TBD.

## Product

**BingeWatcher** — *Build the night, together.*

A production-quality, agent-native (not AI-only) movie planner. Humans curate taste while agents build and maintain persistent, ordered movie lineups through WebMCP. The UI must remain excellent and fully usable without an agent.

Core collaboration: an agent creates a six-pick lineup; the human locks one movie, marks another as Not for me with a reason, and reorders the lineup; the agent rebuilds only the unlocked portion while respecting all state and preferences.

## Hackathon

- WebMCP Challenge; deadline: **4 Sep 2026, 1:30 AM IST**
- Goal: ship the complete, deployed product at production standard and win—not a throwaway demo or fake MVP.
- Submission needs a live URL, public open-source repository + license/instructions, written explanation, and public demo video under 3 minutes.
- Judging: WebMCP leverage, execution, potential impact, creativity/ambition.

## Product scope

- Explore movies and TV through trending, genres, providers, search, recommendations, and rich details
- One default, unordered watchlist; titles can be added directly to a lineup from Explore
- Themed, ordered lineups with explicit preferences and per-pick explanations
- Lineup picks may be a movie, whole TV series, or specific season
- Browse/search/add, drag reorder, lock, Not for me with reason, replace, trailers
- Global watch progress and lightweight reactions; movie progress is title-level and TV progress is episode-level, with season/show completion derived
- Agent discovery, watchlist, lineup, progress, validation, and explanation operations while preserving human decisions
- TMDB-backed metadata, posters, genres/keywords, trailers, recommendations, and regional provider availability
- Anonymous-first persistence; later claim via email magic link, Google, or passkey
- Separate secure resume/edit access from read-only sharing
- Books are later

## WebMCP

WebMCP is a first-class interface over the same application operations used by the human UI—not a separate source of truth. Initial tools under consideration:

`search_media`, `discover_media`, `get_media_details`, `get_recommendations`, `get_watchlist`, `add_to_watchlist`, `remove_from_watchlist`, `list_lineups`, `get_lineup`, `create_lineup`, `add_to_lineup`, `replace_pick`, `remove_pick`, `reorder_picks`, `update_preferences`, `validate_lineup`, `mark_watched`, `record_reaction`

Exact tools and schemas are **TBD**. Mutations must respect authorization, locks/vetoes, validation, and concurrent human edits. Never expose secrets client-side.

## Engineering standard

- Production-ready security, validation, accessibility, error handling, tests, observability, and deployment
- No fake UI, demo-only branches, silent data loss, or core-flow TODOs
- Move fast by keeping architecture simple, not by lowering quality
- Backend/database are authoritative; WebMCP and UI share domain operations
- Prefer existing/native capabilities and minimal dependencies
- Use `bun`/`bunx` unless the chosen stack requires otherwise

## Current state

- Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Bun foundation is complete.
- Premium responsive landing page and program workspace are implemented entirely with Tailwind utilities. Home, Explore, title, lineup library, creation, and lineup workspace surfaces share the same primary navigation; lineup-specific Preferences, History, Share, and back actions live in a secondary contextual toolbar. Lineup pick cards link to canonical movie/series/season pages while their drag, expansion, reaction, and action controls remain independent.
- `/lineups` lists saved lineups and links to the dedicated `/lineups/new` creation page; the homepage keeps its embedded creation form, while creation links elsewhere use the dedicated route. Editable lineup pages provide confirmed whole-lineup deletion with optimistic revision protection; deletion cascades lineup-owned data without touching global watchlist/progress.
- Local SQLite persistence supports anonymous sessions, programs, ordered items, constraints, locks, removable vetoes, watch state, reactions, activity history, optimistic revisions, secure edit/resume tokens, and separate read-only share tokens.
- Backend-only TMDB movie/TV search, discover, genre, provider, details, season/episode, trailer, recommendation, and community score/vote-count integration works with `TMDB_READ_API_KEY`.
- Explore supports paginated trending/popular shelves, title search, combinable genre/provider/language/year/runtime/region/sort discovery filters, shareable filter URLs, personalized recommendation seeds, a default watchlist, and direct add-to-lineup with live counts, membership detection, Remove/Add again, and View lineup feedback. Search and filtered-result grids automatically load additional TMDB pages near the bottom only when more pages exist; editorial shelves retain View more/View less. Shared cinematic dropdown controls are used across the app.
- Rich movie, whole-series, and season pages support linked regional Stream/Rent/Buy provider offers and logos through the backend-only Streaming Availability API, with cached responses and TMDB provider names as fallback, plus trailers, recommendations, watchlist actions, lineup actions, episode-level progress, bulk season/show completion, and lightweight reactions.
- Lineups accept movies, whole TV series, and specific seasons while preserving existing movie data and guarded collaboration behavior; the lineup search modal now uses the same mixed-media search as Explore.
- Imperative WebMCP tools expose discovery, ratings, regional linked streaming offers, details, recommendations, watchlist, progress, constrained reactions, lineup listing/addition, and lineup operations—including optional-reason Not for me—through the same backend domain paths as the UI. `search_media` and `discover_media` always visibly open Explore with canonical, shareable filter URLs; `open_watchlist` and `open_lineup` expose explicit UI navigation. Lineup creation is explicitly empty unless the user asks to populate it, and add/replace rationales are optional rather than agent-invented copy.
- Unit tests, lint, typecheck, production build, and manual API/security smoke tests pass.
- Production is live at `https://bingewatcher-prod.onrender.com` as a paid single-instance Render service in Singapore with a 1 GB persistent disk at `/var/data`, Docker/Node runtime, Bun installs, and a database-aware health check. Health, page, Explore, TMDB search, secure anonymous session, authorization isolation, mutation, deletion, and persistence-across-restart smoke tests pass. Permanent account auth and real WebMCP host testing remain.

## Next

1. Complete manual visual/interaction QA for Explore, title/season pages, watchlist, progress, recommendations, and mixed-media lineups.
2. Test all registered tools in ChatGPT's in-app browser or WebMCP-enabled Chrome.
3. Add focused automated tests for library persistence, episode-derived completion, and mixed-media lineup guards.
4. Test all WebMCP tools against the live Render origin, then prepare submission assets.

## Session handoff checklist

Before ending meaningful work, update:

- **Current state** — what now works
- **Decisions** — settled choices and rationale
- **Next** — ordered actionable tasks
- **Risks/blockers** — unresolved issues
- **Runbook** — setup, test, and deploy commands once they exist

## Decisions

- 2026-08-29: Product is agent-native but human-first and fully usable manually.
- 2026-08-29: Quality target is production standard despite the hackathon deadline.
- 2026-08-29: Tagline: **Build the night, together.**
- 2026-08-29: Do not use Supabase or Sentry; keep infrastructure lean.
- 2026-08-29: Visual direction is premium cinematic black/red. Keep the reference's atmosphere, but reject its generic dashboard layout, internal AI/chat UI, and current Montserrat wordmark/title placement; external agents act through WebMCP.
- 2026-08-29: Use local SQLite during the initial build; check for an existing installation before installing anything globally. Production database remains TBD.
- 2026-08-30: Use a single Next.js/TypeScript/Tailwind app managed with Bun.
- 2026-08-30: All component styling must use Tailwind utility classes. Keep `globals.css` limited to Tailwind import, design tokens/theme, reset/base rules, and truly global browser primitives; do not build component styles there.
- 2026-08-30: Consumer terminology is lineup, picks, preferences, lock, Not for me, and history. Internal database/routes may retain existing program/constraint/veto names to avoid needless churn.
- 2026-08-30: Explore is the discovery core; lineups are an ordered collaborative destination and the default watchlist is an unordered personal destination.
- 2026-08-30: Support movies, whole TV series, and specific seasons as lineup/watchlist entries. Track movies globally at title level and TV at episode level so season/show completion can be derived consistently.
- 2026-08-31: Keep lightweight reactions (Loved it, Wild, Not for me) but omit numeric ratings; BingeWatcher plans and tracks viewing rather than competing with review platforms.
- 2026-08-31: A title may appear more than once in the same lineup; the title page exposes separate Remove and Add again actions and removes one copy at a time.
- 2026-09-01: Human Explore filters and WebMCP `discover_media` use the same validated TMDB discovery parameters: media type, multiple genres/providers, language, year/runtime ranges, region, sort, and pagination.
- 2026-09-01: Keep lineup creation embedded on the homepage, add `/lineups` for the saved-lineup library and `/lineups/new` for creation initiated anywhere else.
- 2026-09-01: Show concise, clearly attributed TMDB community scores without vote-count clutter; continue to omit BingeWatcher numeric user ratings.
- 2026-09-01: Keep provider links off Explore; title and season pages use backend-only Streaming Availability API offers for region-specific provider title links, cached for 24 hours, with TMDB names as fallback.
- 2026-09-01: WebMCP search/discovery must affect visible UI, not only return JSON: they always navigate to canonical Explore URLs and remount filter state, including when invoked from a lineup.
- 2026-09-01: Use API-bounded infinite loading for active search/filter results; keep explicit View more/View less controls for editorial Explore shelves.
- 2026-09-01: Use `SiteNav` as the primary navbar across product pages; page-specific actions belong in page content or a secondary contextual toolbar, never a replacement navbar.
- 2026-09-01: Whole-lineup deletion is available only from the editable lineup page, requires explicit confirmation and the current revision, and preserves global library/progress data.
- 2026-09-01: Lineup cards always show TMDB overview copy as their description. Agent provenance is labeled “Added by agent”; optional agent rationale must not replace metadata or be invented unless the user requests per-pick explanations.
- 2026-09-01: Humans can remove a title from a lineup’s Not for me memory after confirmation; read-only shares cannot mutate it.
- 2026-09-01: Deploy the current synchronous SQLite architecture as one Dockerized Render web service in Singapore with a persistent disk. This avoids a risky database rewrite before submission; use a network database only when multi-instance scaling becomes necessary.

## Risks / blockers

- The selected Render persistent SQLite deployment is intentionally single-instance and has brief restart/deploy downtime; move to a network database before horizontal scaling.
- Permanent email/Google/passkey auth needs provider credentials and production origin configuration.
- WebMCP implementation compiles against the current draft API but still needs an end-to-end test in an actual WebMCP host.
- The current Streaming Availability API free plan is limited to 1,000 requests per month; 24-hour per-title/region caching limits usage but production traffic will require a larger quota.

## Runbook

- Install: `bun install`
- Develop: `bun dev`
- Tests: `bun test`
- Lint: `bun run lint`
- Typecheck: `bun run typecheck`
- Production build: `bun run build`
- Container build: `docker build -t bingewatcher:render .`
- Render config validation: `render blueprints validate render.yaml`
- Render deployment: push `main`; the service auto-deploys commits after provisioning

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
