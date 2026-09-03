import "server-only";

import { sqlite } from "./db";
import { getMedia, getRecommendations } from "./tmdb";
import type { Media, MediaSearchResult, MediaType, WatchlistItem, WatchProgress } from "./types";

const seasonKey = (seasonNumber?: number | null) => seasonNumber ?? -1;

function normalizeMedia(media: Media): Media {
  return { ...media, mediaType: media.mediaType ?? "movie", seasonNumber: media.seasonNumber ?? null };
}

export function listWatchlist(sessionId: string): WatchlistItem[] {
  const rows = sqlite.prepare("SELECT media, added_at FROM watchlist_items WHERE session_id = ? ORDER BY added_at DESC").all(sessionId) as { media: string; added_at: string }[];
  return rows.map((row) => ({ ...normalizeMedia(JSON.parse(row.media) as Media), addedAt: row.added_at }));
}

export async function addToWatchlist(sessionId: string, mediaType: MediaType, tmdbId: number, seasonNumber?: number | null, region = "IN") {
  const media = await getMedia(mediaType, tmdbId, region, seasonNumber);
  const now = new Date().toISOString();
  sqlite.prepare(`INSERT INTO watchlist_items (session_id, media_type, tmdb_id, season_number, media, added_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id, media_type, tmdb_id, season_number) DO UPDATE SET media = excluded.media`)
    .run(sessionId, mediaType, tmdbId, seasonKey(seasonNumber), JSON.stringify(media), now);
  return media;
}

export function removeFromWatchlist(sessionId: string, mediaType: MediaType, tmdbId: number, seasonNumber?: number | null) {
  return sqlite.prepare("DELETE FROM watchlist_items WHERE session_id = ? AND media_type = ? AND tmdb_id = ? AND season_number = ?")
    .run(sessionId, mediaType, tmdbId, seasonKey(seasonNumber)).changes > 0;
}

export function getProgress(sessionId: string, mediaType: MediaType, tmdbId: number, seasonNumber?: number | null): WatchProgress {
  const season = seasonKey(seasonNumber);
  const rows = sqlite.prepare(`SELECT episode_number, watched, reaction, updated_at FROM watch_progress
    WHERE session_id = ? AND media_type = ? AND tmdb_id = ? AND season_number = ? ORDER BY episode_number`)
    .all(sessionId, mediaType, tmdbId, season) as { episode_number: number; watched: number; reaction: string | null; updated_at: string }[];
  const summary = rows.find((row) => row.episode_number === -1);
  return {
    mediaType,
    tmdbId,
    seasonNumber: seasonNumber ?? null,
    watchedEpisodes: rows.filter((row) => row.episode_number >= 0 && row.watched).map((row) => row.episode_number),
    watched: Boolean(summary?.watched),
    reaction: summary?.reaction ?? null,
    updatedAt: summary?.updated_at ?? rows.at(-1)?.updated_at ?? null,
  };
}

function upsertProgress(sessionId: string, mediaType: MediaType, tmdbId: number, seasonNumber: number, episodeNumber: number, watched = true) {
  sqlite.prepare(`INSERT INTO watch_progress (session_id, media_type, tmdb_id, season_number, episode_number, watched, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id, media_type, tmdb_id, season_number, episode_number)
    DO UPDATE SET watched = excluded.watched, updated_at = excluded.updated_at`)
    .run(sessionId, mediaType, tmdbId, seasonNumber, episodeNumber, watched ? 1 : 0, new Date().toISOString());
}

async function syncTvCompletion(sessionId: string, tmdbId: number, seasonNumber: number) {
  const season = await getMedia("tv", tmdbId, "IN", seasonNumber);
  const watched = (sqlite.prepare(`SELECT COUNT(*) count FROM watch_progress WHERE session_id = ? AND media_type = 'tv' AND tmdb_id = ? AND season_number = ? AND episode_number >= 0 AND watched = 1`).get(sessionId, tmdbId, seasonNumber) as { count: number }).count;
  upsertProgress(sessionId, "tv", tmdbId, seasonNumber, -1, watched >= (season.episodeCount ?? Infinity));
  const show = await getMedia("tv", tmdbId);
  const completedSeasons = (sqlite.prepare(`SELECT COUNT(*) count FROM watch_progress WHERE session_id = ? AND media_type = 'tv' AND tmdb_id = ? AND season_number >= 0 AND episode_number = -1 AND watched = 1`).get(sessionId, tmdbId) as { count: number }).count;
  upsertProgress(sessionId, "tv", tmdbId, -1, -1, completedSeasons >= (show.seasons?.length ?? Infinity));
}

export async function setWatched(input: {
  sessionId: string;
  mediaType: MediaType;
  tmdbId: number;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  watched: boolean;
}) {
  const season = seasonKey(input.seasonNumber);
  if (!input.watched) {
    if (input.episodeNumber !== undefined && input.episodeNumber !== null) {
      sqlite.prepare("DELETE FROM watch_progress WHERE session_id = ? AND media_type = ? AND tmdb_id = ? AND season_number = ? AND episode_number = ?")
        .run(input.sessionId, input.mediaType, input.tmdbId, season, input.episodeNumber);
      await syncTvCompletion(input.sessionId, input.tmdbId, season);
    } else if (input.seasonNumber !== undefined && input.seasonNumber !== null) {
      sqlite.prepare("DELETE FROM watch_progress WHERE session_id = ? AND media_type = ? AND tmdb_id = ? AND season_number = ?")
        .run(input.sessionId, input.mediaType, input.tmdbId, season);
      sqlite.prepare("DELETE FROM watch_progress WHERE session_id = ? AND media_type = 'tv' AND tmdb_id = ? AND season_number = -1 AND episode_number = -1")
        .run(input.sessionId, input.tmdbId);
    } else {
      sqlite.prepare("DELETE FROM watch_progress WHERE session_id = ? AND media_type = ? AND tmdb_id = ?")
        .run(input.sessionId, input.mediaType, input.tmdbId);
    }
    return getProgress(input.sessionId, input.mediaType, input.tmdbId, input.seasonNumber);
  }

  if (input.mediaType === "movie" || input.episodeNumber !== undefined && input.episodeNumber !== null) {
    upsertProgress(input.sessionId, input.mediaType, input.tmdbId, season, input.episodeNumber ?? -1);
    if (input.mediaType === "tv") await syncTvCompletion(input.sessionId, input.tmdbId, season);
  } else if (input.seasonNumber !== undefined && input.seasonNumber !== null) {
    const media = await getMedia("tv", input.tmdbId, "IN", input.seasonNumber);
    sqlite.transaction(() => {
      media.episodes?.forEach((episode) => upsertProgress(input.sessionId, "tv", input.tmdbId, season, episode.episodeNumber));
      upsertProgress(input.sessionId, "tv", input.tmdbId, season, -1);
    })();
    await syncTvCompletion(input.sessionId, input.tmdbId, season);
  } else {
    const show = await getMedia("tv", input.tmdbId);
    const seasons = await Promise.all((show.seasons ?? []).map((item) => getMedia("tv", input.tmdbId, "IN", item.seasonNumber)));
    sqlite.transaction(() => {
      seasons.forEach((media) => {
        const key = seasonKey(media.seasonNumber);
        media.episodes?.forEach((episode) => upsertProgress(input.sessionId, "tv", input.tmdbId, key, episode.episodeNumber));
        upsertProgress(input.sessionId, "tv", input.tmdbId, key, -1);
      });
      upsertProgress(input.sessionId, "tv", input.tmdbId, -1, -1);
    })();
  }
  return getProgress(input.sessionId, input.mediaType, input.tmdbId, input.seasonNumber);
}

export function recordGlobalReaction(input: {
  sessionId: string;
  mediaType: MediaType;
  tmdbId: number;
  seasonNumber?: number | null;
  reaction?: string | null;
}) {
  const season = seasonKey(input.seasonNumber);
  const current = getProgress(input.sessionId, input.mediaType, input.tmdbId, input.seasonNumber);
  upsertProgress(input.sessionId, input.mediaType, input.tmdbId, season, -1);
  sqlite.prepare(`UPDATE watch_progress SET reaction = ?, updated_at = ?
    WHERE session_id = ? AND media_type = ? AND tmdb_id = ? AND season_number = ? AND episode_number = -1`)
    .run(input.reaction === undefined ? current.reaction : input.reaction?.trim().slice(0, 80) || null, new Date().toISOString(), input.sessionId, input.mediaType, input.tmdbId, season);
  return getProgress(input.sessionId, input.mediaType, input.tmdbId, input.seasonNumber);
}

export async function personalRecommendations(sessionId: string, page = 1): Promise<MediaSearchResult[]> {
  const progress = sqlite.prepare(`SELECT media_type, tmdb_id FROM watch_progress WHERE session_id = ? AND watched = 1
    GROUP BY media_type, tmdb_id ORDER BY MAX(updated_at) DESC LIMIT 3`).all(sessionId) as { media_type: MediaType; tmdb_id: number }[];
  const watchlist = sqlite.prepare(`SELECT media_type, tmdb_id FROM watchlist_items WHERE session_id = ? ORDER BY added_at DESC LIMIT 3`).all(sessionId) as { media_type: MediaType; tmdb_id: number }[];
  const seeds = [...progress, ...watchlist].filter((seed, index, all) => all.findIndex((item) => item.media_type === seed.media_type && item.tmdb_id === seed.tmdb_id) === index).slice(0, 3);
  if (!seeds.length) return [];
  const lists = await Promise.all(seeds.map((seed) => getRecommendations(seed.media_type, seed.tmdb_id, page).catch(() => [])));
  const scores = new Map<string, { media: MediaSearchResult; score: number }>();
  lists.flat().forEach((media) => {
    if (seeds.some((seed) => seed.media_type === media.mediaType && seed.tmdb_id === media.tmdbId)) return;
    const key = `${media.mediaType}:${media.tmdbId}`;
    const current = scores.get(key);
    scores.set(key, { media, score: (current?.score ?? 0) + 1 });
  });
  return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, 20).map(({ media }) => media);
}
