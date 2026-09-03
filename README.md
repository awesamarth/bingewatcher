# BingeWatcher

**Build the night, together.**

BingeWatcher is a shared discovery and planning app for people and their browser agents. Explore movies and TV, keep a default watchlist, track episode-level progress, and build ordered lineups containing movies, whole series, or specific seasons.

Live: [bingewatcher-prod.onrender.com](https://bingewatcher-prod.onrender.com)

## Run locally

Requirements: Bun and a [TMDB API Read Access Token](https://www.themoviedb.org/settings/api). A [Streaming Availability API](https://www.movieofthenight.com/about/api) key is optional for linked provider offers.

```bash
cp .env.example .env.local
# Add TMDB_READ_API_KEY and optionally STREAMING_AVAILABILITY_API_KEY to .env.local
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000). SQLite data is created at `data/bingewatcher.db` by default.

## Deploy to Render

The included `Dockerfile` and `render.yaml` run BingeWatcher as a single Render web service with a persistent 1 GB disk in Singapore.

1. Create the service from `render.yaml`.
2. Set `TMDB_READ_API_KEY` and optionally `STREAMING_AVAILABILITY_API_KEY` in Render.
3. Keep the disk mounted at `/var/data`; production data is stored at `/var/data/bingewatcher.db`.
4. Use `/api/health` as the health-check path.

SQLite requires one service instance. Move to a network database before enabling multiple instances.

## Check the project

```bash
bun test
bun run lint
bun run typecheck
bun run build
```

## Test WebMCP

Use ChatGPT's in-app browser, or enable `chrome://flags/#enable-webmcp-testing` in a compatible Chrome build. Open BingeWatcher and inspect the page's available site tools.

Across Explore and title pages an agent can search/discover media, read details and recommendations, manage the watchlist, update watch progress and reactions, list lineups, and add discoveries directly to one. Inside a lineup it can read live state, add/replace/remove/reorder picks, update preferences, validate the result, and record watch state while respecting locks and human decisions.

Tools are registered with the imperative `document.modelContext.registerTool()` API. They call the same authenticated backend operations as the human interface; all locks, revisions, access tokens, and constraints are enforced server-side.

## Data and access

- Anonymous visitors receive an HTTP-only session cookie.
- New lineups receive an unguessable edit/resume token.
- Sharing creates a separate read-only bearer URL.
- TMDB and streaming-availability credentials remain server-side.

Local development uses `data/bingewatcher.db`; the Render deployment stores the same SQLite database on its persistent disk.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

## License

[MIT](LICENSE)
