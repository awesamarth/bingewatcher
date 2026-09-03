import "server-only";

import { sqlite } from "./db";
import { getMedia } from "./tmdb";
import { recordGlobalReaction, setWatched } from "./library";
import { defaultConstraints, type Activity, type Constraints, type Media, type MediaType, type Program, type ProgramItem, type Veto } from "./types";

export class ProgramError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type ProgramRow = {
  id: string;
  owner_session_id: string;
  title: string;
  prompt: string;
  target_size: number;
  constraints: string;
  version: number;
  share_token: string;
  edit_token: string;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  media_type: MediaType;
  season_number: number;
  position: number;
  movie: string;
  locked: number;
  watched: number;
  reaction: string | null;
  explanation: string;
  added_by: "human" | "agent";
};

function readProgram(id: string, sessionId: string, shareToken?: string | null, editToken?: string | null): ProgramRow {
  const row = sqlite.prepare("SELECT * FROM programs WHERE id = ?").get(id) as ProgramRow | undefined;
  if (!row) throw new ProgramError("Lineup not found", 404);
  if (row.owner_session_id !== sessionId && row.share_token !== shareToken && row.edit_token !== editToken) {
    throw new ProgramError("You do not have access to this lineup", 403);
  }
  return row;
}

function writableProgram(id: string, sessionId: string, expectedVersion?: number, editToken?: string | null): ProgramRow {
  const row = readProgram(id, sessionId, null, editToken);
  if (row.owner_session_id !== sessionId && row.edit_token !== editToken) throw new ProgramError("This shared lineup is read-only", 403);
  if (expectedVersion !== undefined && row.version !== expectedVersion) {
    throw new ProgramError("The lineup changed. Refresh before editing it again.", 409);
  }
  return row;
}

function bump(programId: string) {
  sqlite.prepare("UPDATE programs SET version = version + 1, updated_at = ? WHERE id = ?").run(new Date().toISOString(), programId);
}

function activity(programId: string, actor: "human" | "agent", action: string, detail: string) {
  sqlite.prepare("INSERT INTO activities (id, program_id, actor, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), programId, actor, action, detail, new Date().toISOString());
}

export function createProgram(input: {
  sessionId: string;
  title: string;
  prompt: string;
  targetSize: number;
  constraints?: Partial<Constraints>;
  actor?: "human" | "agent";
}) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const shareToken = crypto.randomUUID().replaceAll("-", "");
  const editToken = crypto.randomUUID().replaceAll("-", "");
  const constraints = { ...defaultConstraints, ...input.constraints };

  sqlite.transaction(() => {
    sqlite.prepare(`INSERT INTO programs
      (id, owner_session_id, title, prompt, target_size, constraints, version, share_token, edit_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`)
      .run(id, input.sessionId, input.title, input.prompt, input.targetSize, JSON.stringify(constraints), shareToken, editToken, now, now);
    activity(id, input.actor ?? "human", "created_program", `Created “${input.title}” with ${input.targetSize} picks.`);
  })();

  return { id, shareToken, editToken };
}

export function deleteProgram(id: string, sessionId: string, expectedVersion: number, editToken?: string | null) {
  writableProgram(id, sessionId, expectedVersion, editToken);
  return sqlite.prepare("DELETE FROM programs WHERE id = ?").run(id).changes > 0;
}

export function listPrograms(sessionId: string) {
  return sqlite.prepare(`SELECT p.id, p.title, p.prompt, p.target_size targetSize, p.edit_token editToken,
    p.updated_at updatedAt, COUNT(i.id) itemCount
    FROM programs p LEFT JOIN program_items i ON i.program_id = p.id
    WHERE p.owner_session_id = ? GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 12`).all(sessionId) as Array<{
      id: string; title: string; prompt: string; targetSize: number; editToken: string; updatedAt: string; itemCount: number;
    }>;
}

export function getProgram(id: string, sessionId: string, shareToken?: string | null, editToken?: string | null): Program {
  const row = readProgram(id, sessionId, shareToken, editToken);
  const itemRows = sqlite.prepare("SELECT * FROM program_items WHERE program_id = ? ORDER BY position").all(id) as ItemRow[];
  const vetoRows = sqlite.prepare("SELECT media_type, tmdb_id, season_number, title, reason, created_at FROM vetoes WHERE program_id = ? ORDER BY created_at DESC").all(id) as Array<{ media_type: MediaType; tmdb_id: number; season_number: number; title: string; reason: string; created_at: string }>;
  const activityRows = sqlite.prepare("SELECT id, actor, action, detail, created_at FROM activities WHERE program_id = ? ORDER BY created_at DESC LIMIT 30").all(id) as Array<{ id: string; actor: "human" | "agent"; action: string; detail: string; created_at: string }>;

  const items: ProgramItem[] = itemRows.map((item) => ({
    ...(JSON.parse(item.movie) as Media),
    mediaType: item.media_type,
    seasonNumber: item.season_number < 0 ? null : item.season_number,
    id: item.id,
    position: item.position,
    locked: Boolean(item.locked),
    watched: Boolean(item.watched),
    reaction: item.reaction,
    explanation: item.explanation,
    addedBy: item.added_by,
  }));
  const vetoes: Veto[] = vetoRows.map((veto) => ({
    mediaType: veto.media_type,
    tmdbId: veto.tmdb_id,
    seasonNumber: veto.season_number < 0 ? null : veto.season_number,
    title: veto.title,
    reason: veto.reason,
    createdAt: veto.created_at,
  }));
  const activities: Activity[] = activityRows.map((entry) => ({
    id: entry.id,
    actor: entry.actor,
    action: entry.action,
    detail: entry.detail,
    createdAt: entry.created_at,
  }));

  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    targetSize: row.target_size,
    constraints: JSON.parse(row.constraints) as Constraints,
    version: row.version,
    shareToken: row.share_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
    vetoes,
    activity: activities,
  };
}

function normalizePositions(programId: string) {
  const ids = sqlite.prepare("SELECT id FROM program_items WHERE program_id = ? ORDER BY position").all(programId) as { id: string }[];
  const update = sqlite.prepare("UPDATE program_items SET position = ? WHERE id = ?");
  ids.forEach((item, index) => update.run(-(index + 1), item.id));
  ids.forEach((item, index) => update.run(index, item.id));
}

export async function performAction(
  programId: string,
  sessionId: string,
  input: Record<string, unknown> & { action: string; actor: "human" | "agent"; expectedVersion?: number },
  editToken?: string | null,
) {
  const program = writableProgram(programId, sessionId, input.expectedVersion, editToken);
  const actor = input.actor;

  if (["add_movie", "replace_movie", "add_media", "replace_media"].includes(input.action)) {
    const tmdbId = Number(input.tmdbId);
    const mediaType: MediaType = input.mediaType === "tv" ? "tv" : "movie";
    const seasonNumber = input.seasonNumber === undefined || input.seasonNumber === null ? null : Number(input.seasonNumber);
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) throw new ProgramError("A valid TMDB title ID is required");
    if (seasonNumber !== null && (mediaType !== "tv" || !Number.isInteger(seasonNumber) || seasonNumber < 0)) throw new ProgramError("A valid TV season is required");
    const seasonKey = seasonNumber ?? -1;
    const veto = sqlite.prepare("SELECT reason FROM vetoes WHERE program_id = ? AND media_type = ? AND tmdb_id = ? AND season_number = ?").get(programId, mediaType, tmdbId, seasonKey) as { reason: string } | undefined;
    if (veto) throw new ProgramError(`That title is marked Not for me${veto.reason ? `: ${veto.reason}` : "."}`, 409);
    const media = await getMedia(mediaType, tmdbId, (JSON.parse(program.constraints) as Constraints).region, seasonNumber);
    writableProgram(programId, sessionId, input.expectedVersion, editToken);
    const explanation = String(input.explanation ?? "").trim().slice(0, 600);
    const now = new Date().toISOString();

    sqlite.transaction(() => {
      if (input.action === "replace_movie" || input.action === "replace_media") {
        const itemId = String(input.itemId ?? "");
        const old = sqlite.prepare("SELECT locked, movie FROM program_items WHERE id = ? AND program_id = ?").get(itemId, programId) as { locked: number; movie: string } | undefined;
        if (!old) throw new ProgramError("Pick not found", 404);
        if (old.locked) throw new ProgramError("Locked movies cannot be replaced", 409);
        sqlite.prepare("DELETE FROM program_items WHERE id = ?").run(itemId);
        normalizePositions(programId);
      }
      const count = (sqlite.prepare("SELECT COUNT(*) count FROM program_items WHERE program_id = ?").get(programId) as { count: number }).count;
      if (count >= program.target_size) throw new ProgramError("This lineup has no empty picks", 409);
      sqlite.prepare(`INSERT INTO program_items
        (id, program_id, media_type, tmdb_id, season_number, position, movie, locked, watched, explanation, added_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), programId, mediaType, media.tmdbId, seasonKey, count, JSON.stringify(media), explanation, actor, now, now);
      bump(programId);
      activity(programId, actor, input.action, `${input.action.startsWith("add") ? "Added" : "Replaced a selection with"} “${media.title}”.`);
    })();
    return getProgram(programId, sessionId, null, editToken);
  }

  if (input.action === "mark_watched" || input.action === "record_reaction") {
    const itemId = String(input.itemId ?? "");
    const row = sqlite.prepare("SELECT movie FROM program_items WHERE id = ? AND program_id = ?").get(itemId, programId) as { movie: string } | undefined;
    if (!row) throw new ProgramError("Pick not found", 404);
    const media = JSON.parse(row.movie) as Media;
    if (input.action === "mark_watched") {
      const watched = Boolean(input.watched);
      await setWatched({ sessionId, mediaType: media.mediaType ?? "movie", tmdbId: media.tmdbId, seasonNumber: media.seasonNumber, watched });
      writableProgram(programId, sessionId, input.expectedVersion, editToken);
      sqlite.transaction(() => {
        sqlite.prepare("UPDATE program_items SET watched = ?, updated_at = ? WHERE id = ?").run(watched ? 1 : 0, new Date().toISOString(), itemId);
        activity(programId, actor, "marked_watched", `${watched ? "Marked" : "Unmarked"} “${media.title}” as watched.`);
        bump(programId);
      })();
    } else {
      const reaction = String(input.reaction ?? "").trim().slice(0, 40) || null;
      recordGlobalReaction({ sessionId, mediaType: media.mediaType ?? "movie", tmdbId: media.tmdbId, seasonNumber: media.seasonNumber, reaction });
      sqlite.transaction(() => {
        sqlite.prepare("UPDATE program_items SET reaction = ?, updated_at = ? WHERE id = ?").run(reaction, new Date().toISOString(), itemId);
        activity(programId, actor, "recorded_reaction", reaction ? `Reacted ${reaction}.` : "Cleared a reaction.");
        bump(programId);
      })();
    }
    return getProgram(programId, sessionId, null, editToken);
  }

  sqlite.transaction(() => {
    switch (input.action) {
      case "remove_movie":
      case "remove_media": {
        const itemId = String(input.itemId ?? "");
        const item = sqlite.prepare("SELECT locked, movie FROM program_items WHERE id = ? AND program_id = ?").get(itemId, programId) as { locked: number; movie: string } | undefined;
        if (!item) throw new ProgramError("Pick not found", 404);
        if (item.locked && actor === "agent") throw new ProgramError("Agents cannot remove locked picks", 409);
        sqlite.prepare("DELETE FROM program_items WHERE id = ?").run(itemId);
        normalizePositions(programId);
        const media = JSON.parse(item.movie) as Media;
        activity(programId, actor, "removed_media", `Removed “${media.title}”.`);
        break;
      }
      case "reorder_movies":
      case "reorder_media": {
        const itemIds = Array.isArray(input.itemIds) ? input.itemIds.map(String) : [];
        const existing = sqlite.prepare("SELECT id, locked, position FROM program_items WHERE program_id = ? ORDER BY position").all(programId) as { id: string; locked: number; position: number }[];
        if (itemIds.length !== existing.length || new Set(itemIds).size !== existing.length || existing.some((item) => !itemIds.includes(item.id))) throw new ProgramError("Reorder must include every pick exactly once");
        if (actor === "agent" && existing.some((item) => item.locked && itemIds[item.position] !== item.id)) throw new ProgramError("Agents cannot move locked picks", 409);
        const update = sqlite.prepare("UPDATE program_items SET position = ?, updated_at = ? WHERE id = ?");
        itemIds.forEach((id, index) => update.run(-(index + 1), new Date().toISOString(), id));
        itemIds.forEach((id, index) => update.run(index, new Date().toISOString(), id));
        activity(programId, actor, "reordered_media", "Reordered the lineup.");
        break;
      }
      case "set_lock": {
        const itemId = String(input.itemId ?? "");
        const locked = Boolean(input.locked);
        const result = sqlite.prepare("UPDATE program_items SET locked = ?, updated_at = ? WHERE id = ? AND program_id = ?").run(locked ? 1 : 0, new Date().toISOString(), itemId, programId);
        if (!result.changes) throw new ProgramError("Pick not found", 404);
        activity(programId, actor, locked ? "locked_media" : "unlocked_media", `${locked ? "Locked" : "Unlocked"} a pick.`);
        break;
      }
      case "veto_movie":
      case "veto_media": {
        const itemId = String(input.itemId ?? "");
        const reason = String(input.reason ?? "").trim();
        const item = sqlite.prepare("SELECT movie, locked FROM program_items WHERE id = ? AND program_id = ?").get(itemId, programId) as { movie: string; locked: number } | undefined;
        if (!item) throw new ProgramError("Pick not found", 404);
        if (actor === "agent" && item.locked) throw new ProgramError("Agents cannot mark locked picks as Not for me", 409);
        const media = JSON.parse(item.movie) as Media;
        sqlite.prepare("DELETE FROM program_items WHERE id = ?").run(itemId);
        sqlite.prepare("INSERT OR REPLACE INTO vetoes (id, program_id, media_type, tmdb_id, season_number, title, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .run(crypto.randomUUID(), programId, media.mediaType ?? "movie", media.tmdbId, media.seasonNumber ?? -1, media.title, reason.slice(0, 500), new Date().toISOString());
        normalizePositions(programId);
        activity(programId, actor, "vetoed_media", `Marked “${media.title}” as Not for me${reason ? `: ${reason.slice(0, 180)}` : "."}`);
        break;
      }
      case "remove_veto": {
        const mediaType: MediaType = input.mediaType === "tv" ? "tv" : "movie";
        const tmdbId = Number(input.tmdbId);
        const seasonNumber = input.seasonNumber === undefined || input.seasonNumber === null ? -1 : Number(input.seasonNumber);
        const veto = sqlite.prepare("SELECT title FROM vetoes WHERE program_id = ? AND media_type = ? AND tmdb_id = ? AND season_number = ?").get(programId, mediaType, tmdbId, seasonNumber) as { title: string } | undefined;
        if (!veto) throw new ProgramError("Not for me title not found", 404);
        sqlite.prepare("DELETE FROM vetoes WHERE program_id = ? AND media_type = ? AND tmdb_id = ? AND season_number = ?").run(programId, mediaType, tmdbId, seasonNumber);
        activity(programId, actor, "removed_veto", `Removed “${veto.title}” from Not for me.`);
        break;
      }
      case "update_constraints": {
        const patch = input.constraints && typeof input.constraints === "object" ? input.constraints as Partial<Constraints> : {};
        const current = JSON.parse(program.constraints) as Constraints;
        const next = { ...current, ...patch, region: String(patch.region ?? current.region).toUpperCase().slice(0, 2) };
        if (next.yearMin && next.yearMax && next.yearMin > next.yearMax) throw new ProgramError("The earliest release year cannot be after the latest year");
        sqlite.prepare("UPDATE programs SET constraints = ? WHERE id = ?").run(JSON.stringify(next), programId);
        activity(programId, actor, "updated_constraints", "Updated the lineup preferences.");
        break;
      }
      default:
        throw new ProgramError("Unknown lineup action");
    }
    bump(programId);
  })();

  return getProgram(programId, sessionId, null, editToken);
}

