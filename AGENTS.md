# BingeWatcher — Agent Handoff

Keep this file current after every meaningful decision, implementation milestone, or scope change. Read it before starting work; do not invent decisions where it says TBD.

## Product

**BingeWatcher** — *Build the night, together.*

A production-quality, agent-native (not AI-only) movie planner. Humans curate taste while agents build and maintain persistent, ordered movie programs through WebMCP. The UI must remain excellent and fully usable without an agent.

Core collaboration: an agent creates a six-film program; the human locks one movie, vetoes another with a reason, and reorders the lineup; the agent rebuilds only the unlocked portion while respecting all state and constraints.

## Hackathon

- WebMCP Challenge; deadline: **4 Sep 2026, 1:30 AM IST**
- Goal: ship the complete, deployed product at production standard and win—not a throwaway demo or fake MVP.
- Submission needs a live URL, public open-source repository + license/instructions, written explanation, and public demo video under 3 minutes.
- Judging: WebMCP leverage, execution, potential impact, creativity/ambition.

## Product scope

- Themed, ordered programs with explicit constraints and per-selection explanations
- Browse/search/add, drag reorder, lock, veto with reason, replace, trailers
- Watch history and ratings/reactions
- Agent search, fill, replace, reorder, validate, and explain while preserving human decisions
- TMDB-backed metadata, posters, genres/keywords, trailers, recommendations, and regional provider availability
- Anonymous-first persistence; later claim via email magic link, Google, or passkey
- Separate secure resume/edit access from read-only sharing
- Movies only; TV and books are later

## WebMCP

WebMCP is a first-class interface over the same application operations used by the human UI—not a separate source of truth. Initial tools under consideration:

`get_program`, `search_movies`, `create_program`, `update_constraints`, `add_movie`, `replace_movie`, `remove_movie`, `reorder_movie`, `fill_empty_slots`, `validate_program`, `mark_watched`, `record_reaction`

Exact tools and schemas are **TBD**. Mutations must respect authorization, locks/vetoes, validation, and concurrent human edits. Never expose secrets client-side.

## Engineering standard

- Production-ready security, validation, accessibility, error handling, tests, observability, and deployment
- No fake UI, demo-only branches, silent data loss, or core-flow TODOs
- Move fast by keeping architecture simple, not by lowering quality
- Backend/database are authoritative; WebMCP and UI share domain operations
- Prefer existing/native capabilities and minimal dependencies
- Use `bun`/`bunx` unless the chosen stack requires otherwise

## Current state

- Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Bun scaffolded successfully.
- Lint and production build pass.
- Product direction and tagline agreed.
- Data model, detailed design, auth, persistence, WebMCP tools, and deployment remain to be built.

## Next

1. Resolve the next product/technical discussion with the user.
2. Record decisions here.
3. Define architecture and execution plan before scaffolding.

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

## Risks / blockers

- None recorded yet.

## Runbook

- Install: `bun install`
- Develop: `bun dev`
- Lint: `bun run lint`
- Production build: `bun run build`
