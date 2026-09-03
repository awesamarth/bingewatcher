"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const stringField = (description: string) => ({ type: "string", description });
const integerField = (description: string) => ({ type: "integer", description });
const mediaTypeField = { type: "string", enum: ["movie", "tv"], description: "TMDB media type" };
const reactionField = { type: ["string", "null"], enum: ["Loved it", "Wild", "Not for me", null], description: "Supported reaction, or null to clear it" };

function discoverParams(input: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (input.mediaType) params.set("type", String(input.mediaType));
  if (Array.isArray(input.genreIds) && input.genreIds.length) params.set("genres", input.genreIds.join(","));
  if (Array.isArray(input.genres) && input.genres.length) params.set("genreNames", input.genres.join(","));
  if (Array.isArray(input.providerIds) && input.providerIds.length) params.set("providers", input.providerIds.join(","));
  for (const field of ["language", "yearMin", "yearMax", "runtimeMin", "runtimeMax", "region", "sort", "page"] as const) if (input[field] !== undefined && input[field] !== null) params.set(field, String(input[field]));
  return params;
}

async function json<T>(response: Response): Promise<T> {
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`);
  return data as T;
}

export function WebMCPTools({ programId }: { programId?: string; surface?: "explore" }) {
  const router = useRouter();

  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext) return;
    const controller = new AbortController();
    const register = (tool: WebMCPTool) => modelContext.registerTool(tool, { signal: controller.signal }).catch((error) => {
      if (!controller.signal.aborted) console.error(`WebMCP tool ${tool.name} failed to register`, error);
    });
    const mediaTarget = {
      mediaType: mediaTypeField,
      tmdbId: integerField("TMDB title ID"),
      seasonNumber: { type: ["integer", "null"], minimum: 0, description: "Optional TV season number; omit for the whole series" },
    };

    register({
      name: "search_media",
      description: "Search TMDB for movies and TV series and open the visible results in Explore. This does not change the watchlist or a lineup.",
      inputSchema: objectSchema({ query: stringField("Title, person, theme, or search phrase"), mediaType: { type: ["string", "null"], enum: ["movie", "tv", null] } }, ["query"]),
      annotations: { readOnlyHint: true },
      execute: async ({ query, mediaType }) => {
        const params = new URLSearchParams({ q: String(query) });
        if (mediaType) params.set("type", String(mediaType));
        const result = await json<Record<string, unknown>>(await fetch(`/api/media/search?${params}`));
        router.push(`/explore?${params}`);
        return JSON.stringify({ ...result, openedInExplore: true });
      },
    });
    register({
      name: "discover_media",
      description: "Discover movies and TV series and visibly apply the filters in Explore. Use genre names for natural requests or TMDB genre IDs when known. Genre filters are combined with AND; provider IDs with OR.",
      inputSchema: objectSchema({
        mediaType: { type: ["string", "null"], enum: ["movie", "tv", null] },
        genres: { type: "array", items: { type: "string", minLength: 2, maxLength: 40 }, maxItems: 12, description: "Human-readable TMDB genre names, such as Horror or Crime; mediaType is required" },
        genreIds: { type: "array", items: { type: "integer", minimum: 1 }, maxItems: 12, description: "TMDB genre IDs when already known" },
        providerIds: { type: "array", items: { type: "integer", minimum: 1 }, maxItems: 20, description: "TMDB watch provider IDs" },
        language: { type: ["string", "null"], minLength: 2, maxLength: 2, description: "ISO 639-1 original-language code, such as en or hi" },
        yearMin: { type: ["integer", "null"], minimum: 1870, maximum: 2100 },
        yearMax: { type: ["integer", "null"], minimum: 1870, maximum: 2100 },
        runtimeMin: { type: ["integer", "null"], minimum: 1, maximum: 1000, description: "Minimum runtime in minutes" },
        runtimeMax: { type: ["integer", "null"], minimum: 1, maximum: 1000, description: "Maximum runtime in minutes" },
        region: { type: ["string", "null"], minLength: 2, maxLength: 2, description: "ISO 3166-1 streaming region, defaults to IN" },
        sort: { type: ["string", "null"], enum: ["popularity.desc", "vote_average.desc", "date.desc", null] },
        page: { type: "integer", minimum: 1, maximum: 20 },
      }),
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const apiParams = discoverParams(input);
        const result = await json<Record<string, unknown> & { resolvedGenreIds?: number[] }>(await fetch(`/api/media/discover?${apiParams}`));
        const viewParams = discoverParams(input);
        viewParams.delete("genreNames");
        viewParams.delete("page");
        if (result.resolvedGenreIds?.length) viewParams.set("genres", result.resolvedGenreIds.join(","));
        router.push(`/explore${viewParams.size ? `?${viewParams}` : ""}`);
        return JSON.stringify({ ...result, openedInExplore: true });
      },
    });
    register({
      name: "get_media_details",
      description: "Get rich TMDB details, community score, trailer, seasons, episodes, and regional streaming offers with provider title-page links.",
      inputSchema: objectSchema({ ...mediaTarget, region: { type: ["string", "null"], minLength: 2, maxLength: 2, description: "ISO 3166-1 streaming region, defaults to IN" } }, ["mediaType", "tmdbId"]),
      annotations: { readOnlyHint: true },
      execute: async ({ mediaType, tmdbId, seasonNumber, region }) => {
        const query = new URLSearchParams();
        if (seasonNumber !== undefined && seasonNumber !== null) query.set("season", String(seasonNumber));
        if (region) query.set("region", String(region));
        return JSON.stringify(await json(await fetch(`/api/media/${mediaType}/${tmdbId}${query.size ? `?${query}` : ""}`)));
      },
    });
    register({
      name: "get_recommendations",
      description: "Get TMDB's related-title recommendations for one movie or TV series.",
      inputSchema: objectSchema({ mediaType: mediaTypeField, tmdbId: integerField("TMDB title ID") }, ["mediaType", "tmdbId"]),
      annotations: { readOnlyHint: true },
      execute: async ({ mediaType, tmdbId }) => JSON.stringify(await json(await fetch(`/api/media/${mediaType}/${tmdbId}/recommendations`))),
    });
    register({
      name: "get_watchlist",
      description: "Read the user's default watchlist.",
      inputSchema: objectSchema({}),
      annotations: { readOnlyHint: true },
      execute: async () => JSON.stringify(await json(await fetch("/api/watchlist"))),
    });
    register({
      name: "open_watchlist",
      description: "Open the user's visible watchlist in Explore.",
      inputSchema: objectSchema({}),
      annotations: { readOnlyHint: true },
      execute: () => { router.push("/explore#watchlist"); return JSON.stringify({ opened: true, url: "/explore#watchlist" }); },
    });
    register({
      name: "add_to_watchlist",
      description: "Save a movie, whole TV series, or specific TV season to the user's default watchlist.",
      inputSchema: objectSchema(mediaTarget, ["mediaType", "tmdbId"]),
      execute: async (input) => {
        const result = await json(await fetch("/api/watchlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }));
        window.dispatchEvent(new Event("bingewatcher:library-refresh"));
        return JSON.stringify(result);
      },
    });
    register({
      name: "remove_from_watchlist",
      description: "Remove a movie, series, or season from the user's default watchlist.",
      inputSchema: objectSchema(mediaTarget, ["mediaType", "tmdbId"]),
      execute: async (input) => {
        await json(await fetch("/api/watchlist", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }));
        window.dispatchEvent(new Event("bingewatcher:library-refresh"));
        return JSON.stringify({ success: true });
      },
    });
    register({
      name: "list_lineups",
      description: "List the user's editable lineups so a discovered title can be added to one.",
      inputSchema: objectSchema({}),
      annotations: { readOnlyHint: true },
      execute: async () => JSON.stringify(await json(await fetch("/api/programs"))),
    });
    register({
      name: "open_lineup",
      description: "Open the visible My lineups page, or open a specific lineup when lineupId is provided.",
      inputSchema: objectSchema({ lineupId: { type: ["string", "null"], pattern: "^[0-9a-fA-F-]{36}$", description: "Optional lineup ID from list_lineups" } }),
      annotations: { readOnlyHint: true },
      execute: ({ lineupId }) => {
        const url = lineupId ? `/program/${encodeURIComponent(String(lineupId))}` : "/lineups";
        router.push(url);
        return JSON.stringify({ opened: true, url });
      },
    });
    register({
      name: "record_media_reaction",
      description: "Record or clear the user's reaction to a movie, series, or season.",
      inputSchema: objectSchema({ ...mediaTarget, reaction: reactionField }, ["mediaType", "tmdbId", "reaction"]),
      execute: async (input) => {
        const result = await json(await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }));
        window.dispatchEvent(new Event("bingewatcher:library-refresh"));
        return JSON.stringify(result);
      },
    });
    register({
      name: "set_watch_progress",
      description: "Mark a movie, series, season, or TV episode watched or unwatched. Season and series completion is derived from episode progress.",
      inputSchema: objectSchema({ ...mediaTarget, episodeNumber: { type: ["integer", "null"], minimum: 1 }, watched: { type: "boolean" } }, ["mediaType", "tmdbId", "watched"]),
      execute: async (input) => {
        const result = await json(await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }));
        window.dispatchEvent(new Event("bingewatcher:library-refresh"));
        return JSON.stringify(result);
      },
    });

    if (!programId) {
      register({
        name: "create_lineup",
        description: "Create and open an empty persistent ordered lineup. targetSize sets its capacity only; it does not add or authorize choosing titles. After creation, stop unless the user explicitly asked to add, fill, or populate picks.",
        inputSchema: objectSchema({ title: stringField("Short lineup title"), prompt: stringField("Theme, progression, mood, audience, and preferences"), targetSize: { type: "integer", minimum: 1, maximum: 20, description: "Number of picks; defaults to 6" } }, ["title", "prompt"]),
        execute: async ({ title, prompt, targetSize }) => {
          const result = await json<{ id: string; editToken: string }>(await fetch("/api/programs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, prompt, targetSize: targetSize ?? 6, actor: "agent" }) }));
          router.push(`/program/${result.id}?edit=${result.editToken}`);
          return JSON.stringify({ success: true, lineupId: result.id });
        },
      });
      register({
        name: "add_to_lineup",
        description: "Add a discovered movie, whole series, or season to one of the user's lineups. Only add titles the user explicitly named or asked you to choose.",
        inputSchema: objectSchema({ lineupId: stringField("Lineup ID from list_lineups"), ...mediaTarget, explanation: stringField("Optional rationale; omit unless the user explicitly asked for per-pick explanations") }, ["lineupId", "mediaType", "tmdbId"]),
        execute: async ({ lineupId, ...media }) => {
          const current = await json<{ program: { version: number } }>(await fetch(`/api/programs/${lineupId}`));
          const result = await json(await fetch(`/api/programs/${lineupId}/actions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "add_media", actor: "agent", expectedVersion: current.program.version, ...media }) }));
          return JSON.stringify(result);
        },
      });
      return () => controller.abort();
    }

    const access = window.location.search;
    const get = async () => json<{ program: { version: number }; validation: unknown }>(await fetch(`/api/programs/${programId}${access}`));
    const act = async (action: Record<string, unknown>) => {
      const current = await get();
      const result = await json<{ program: unknown; validation: unknown }>(await fetch(`/api/programs/${programId}/actions${access}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...action, actor: "agent", expectedVersion: current.program.version }) }));
      window.dispatchEvent(new Event("bingewatcher:refresh"));
      return JSON.stringify({ lineup: result.program, validation: result.validation });
    };

    register({ name: "get_lineup", description: "Read the current lineup including order, locks, Not for me reasons, preferences, watch state, history, and validation.", inputSchema: objectSchema({}), annotations: { readOnlyHint: true }, execute: async () => { const result = await get(); return JSON.stringify({ lineup: result.program, validation: result.validation }); } });
    register({ name: "add_media", description: "Add a movie, whole TV series, or specific season as the next pick. Only add titles the user explicitly named or asked you to choose.", inputSchema: objectSchema({ ...mediaTarget, explanation: stringField("Optional rationale; omit unless the user explicitly asked for per-pick explanations") }, ["mediaType", "tmdbId"]), execute: (input) => act({ action: "add_media", ...input }) });
    register({ name: "replace_pick", description: "Replace one unlocked lineup pick with a movie, series, or season.", inputSchema: objectSchema({ itemId: stringField("Lineup pick ID"), ...mediaTarget, explanation: stringField("Optional rationale; omit unless the user explicitly asked for per-pick explanations") }, ["itemId", "mediaType", "tmdbId"]), execute: (input) => act({ action: "replace_media", ...input }) });
    register({ name: "remove_pick", description: "Remove an unlocked pick. Agents cannot remove locked picks.", inputSchema: objectSchema({ itemId: stringField("Lineup pick ID") }, ["itemId"]), execute: (input) => act({ action: "remove_media", ...input }) });
    register({ name: "mark_not_for_me", description: "Remove an unlocked pick and remember that it does not fit the user's taste. The reason is optional.", inputSchema: objectSchema({ itemId: stringField("Lineup pick ID"), reason: { type: "string", maxLength: 500, description: "Optional reason this pick does not belong" } }, ["itemId"]), execute: (input) => act({ action: "veto_media", ...input }) });
    register({ name: "reorder_picks", description: "Set the complete pick order while preserving locked positions.", inputSchema: objectSchema({ itemIds: { type: "array", items: { type: "string" } } }, ["itemIds"]), execute: (input) => act({ action: "reorder_media", ...input }) });
    register({ name: "update_preferences", description: "Update structured lineup preferences. Omitted fields remain unchanged.", inputSchema: objectSchema({ preferences: { type: "object", properties: { runtimeMax: { type: ["integer", "null"] }, languages: { type: "array", items: { type: "string" } }, genres: { type: "array", items: { type: "string" } }, providers: { type: "array", items: { type: "string" } }, yearMin: { type: ["integer", "null"] }, yearMax: { type: ["integer", "null"] }, region: { type: "string", minLength: 2, maxLength: 2 }, notes: { type: "string" } } } }, ["preferences"]), execute: ({ preferences }) => act({ action: "update_constraints", constraints: preferences }) });
    register({ name: "validate_lineup", description: "Check every pick against lineup size, runtime, language, genre, release year, and streaming preferences.", inputSchema: objectSchema({}), annotations: { readOnlyHint: true }, execute: async () => JSON.stringify((await get()).validation) });
    register({ name: "mark_watched", description: "Mark a lineup pick watched or unwatched and update global watch progress.", inputSchema: objectSchema({ itemId: stringField("Lineup pick ID"), watched: { type: "boolean" } }, ["itemId", "watched"]), execute: (input) => act({ action: "mark_watched", ...input }) });
    register({ name: "record_reaction", description: "Record or clear the user's reaction to a watched pick.", inputSchema: objectSchema({ itemId: stringField("Lineup pick ID"), reaction: reactionField }, ["itemId", "reaction"]), execute: (input) => act({ action: "record_reaction", ...input }) });

    return () => controller.abort();
  }, [programId, router]);

  return null;
}
