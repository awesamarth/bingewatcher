"use client";

import { Bookmark, Check, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SelectMenu } from "@/components/dropdown";
import type { Media, WatchProgress, WatchlistItem } from "@/lib/types";

type Lineup = { id: string; title: string; targetSize: number; itemCount: number };
type LineupItem = { id: string; mediaType: "movie" | "tv"; tmdbId: number; seasonNumber: number | null };
type LoadedLineup = { version: number; items: LineupItem[] };

async function json<T>(input: Response | Promise<Response>): Promise<T> {
  const response = await input;
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`);
  return data as T;
}

export function TitleActions({ media }: { media: Media }) {
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState<WatchProgress | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [selectedLineup, setSelectedLineup] = useState("");
  const [loadedLineup, setLoadedLineup] = useState<LoadedLineup | null>(null);
  const [lineupBusy, setLineupBusy] = useState(false);
  const [message, setMessage] = useState("");
  const target = useMemo(() => ({ mediaType: media.mediaType, tmdbId: media.tmdbId, seasonNumber: media.seasonNumber }), [media]);

  useEffect(() => {
    const season = media.seasonNumber === null ? "" : `&season=${media.seasonNumber}`;
    Promise.all([
      json<{ items: WatchlistItem[] }>(fetch("/api/watchlist")),
      json<{ progress: WatchProgress }>(fetch(`/api/progress?type=${media.mediaType}&id=${media.tmdbId}${season}`)),
      json<{ programs: Lineup[] }>(fetch("/api/programs")),
    ]).then(([list, watched, owned]) => {
      setSaved(list.items.some((item) => item.mediaType === media.mediaType && item.tmdbId === media.tmdbId && item.seasonNumber === media.seasonNumber));
      setProgress(watched.progress);
      setLineups(owned.programs);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Could not load your library"));
  }, [media]);

  async function toggleSaved() {
    await json(await fetch("/api/watchlist", { method: saved ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(target) }));
    setSaved(!saved);
  }

  async function toggleWatched() {
    const result = await json<{ progress: WatchProgress }>(await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...target, watched: !progress?.watched }) }));
    setProgress(result.progress);
  }

  async function toggleEpisode(episodeNumber: number) {
    const watched = progress?.watchedEpisodes.includes(episodeNumber) ?? false;
    const result = await json<{ progress: WatchProgress }>(await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...target, episodeNumber, watched: !watched }) }));
    setProgress(result.progress);
  }

  async function updateFeedback(feedback: { reaction: string | null }) {
    const result = await json<{ progress: WatchProgress }>(await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...target, ...feedback }) }));
    setProgress(result.progress);
  }

  useEffect(() => {
    if (!selectedLineup) return;
    const controller = new AbortController();
    json<{ program: LoadedLineup }>(fetch(`/api/programs/${selectedLineup}`, { signal: controller.signal })).then((result) => setLoadedLineup(result.program)).catch(() => {});
    return () => controller.abort();
  }, [selectedLineup]);

  const includedItems = loadedLineup?.items.filter((item) => item.mediaType === media.mediaType && item.tmdbId === media.tmdbId && item.seasonNumber === media.seasonNumber) ?? [];

  async function updateLineup(mode: "add" | "remove") {
    if (!selectedLineup || !loadedLineup) return;
    setLineupBusy(true);
    setMessage("");
    try {
      const result = await json<{ program: LoadedLineup }>(await fetch(`/api/programs/${selectedLineup}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "remove"
          ? { action: "remove_media", actor: "human", expectedVersion: loadedLineup.version, itemId: includedItems[0]?.id }
          : { action: "add_media", actor: "human", expectedVersion: loadedLineup.version, ...target, explanation: "" }),
      }));
      setLoadedLineup(result.program);
      setLineups((items) => items.map((lineup) => lineup.id === selectedLineup ? { ...lineup, itemCount: result.program.items.length } : lineup));
      setMessage(mode === "remove" ? "Removed from your lineup." : "Added to your lineup.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update this lineup");
    } finally {
      setLineupBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2">
        <button className={`inline-flex cursor-pointer items-center gap-2 border px-4 py-3 text-xs font-semibold ${saved ? "border-pulse bg-[#2a0d0b] text-[#ff9b94]" : "border-white/25 hover:border-white"}`} onClick={toggleSaved}>{saved ? <Check size={16} /> : <Bookmark size={16} />}{saved ? "In watchlist" : "Add to watchlist"}</button>
        <button className={`inline-flex cursor-pointer items-center gap-2 border px-4 py-3 text-xs font-semibold ${progress?.watched ? "border-pulse bg-[#2a0d0b] text-[#ff9b94]" : "border-white/25 hover:border-white"}`} onClick={toggleWatched}><Check size={16} />{progress?.watched ? "Watched" : media.seasonNumber !== null ? "Mark season watched" : media.mediaType === "tv" ? "Mark series watched" : "Mark watched"}</button>
      </div>
      <div className="mt-3 flex max-w-145 gap-2">
        <SelectMenu className="min-w-0 flex-1" value={selectedLineup} onChange={(value) => { setSelectedLineup(value); setLoadedLineup(null); setMessage(""); }} ariaLabel="Choose lineup" placeholder="Choose a lineup" options={lineups.map((lineup) => ({ value: lineup.id, label: `${lineup.title} · ${lineup.itemCount}/${lineup.targetSize}` }))} />
        {includedItems.length > 0 ? <><button className="inline-flex cursor-pointer items-center gap-2 border border-pulse bg-[#2a0d0b] px-4 py-3 text-xs font-semibold text-[#ff9b94] disabled:opacity-40" disabled={!loadedLineup || lineupBusy} onClick={() => updateLineup("remove")}><Trash2 size={15} />{lineupBusy ? "Updating…" : "Remove"}</button><button className="inline-flex cursor-pointer items-center gap-2 bg-pulse px-4 py-3 text-xs font-semibold text-white disabled:opacity-40" disabled={!loadedLineup || lineupBusy} onClick={() => updateLineup("add")}><Plus size={16} /> Add again{includedItems.length > 1 ? ` (${includedItems.length})` : ""}</button></> : <button className="inline-flex cursor-pointer items-center gap-2 bg-pulse px-4 py-3 text-xs font-semibold text-white disabled:opacity-40" disabled={!selectedLineup || !loadedLineup || lineupBusy} onClick={() => updateLineup("add")}><Plus size={16} />{lineupBusy ? "Updating…" : "Add"}</button>}
      </div>
      {message && <p className="mt-3 text-xs text-[#e7b2ad]" role="status">{message}{selectedLineup && (message === "Added to your lineup." || message === "Removed from your lineup.") && <> <Link className="font-semibold text-white underline decoration-white/35 underline-offset-4 hover:decoration-pulse" href={`/program/${selectedLineup}`}>View lineup →</Link></>}</p>}
      {progress?.watched && <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Your reaction">
        {["Loved it", "Wild", "Not for me"].map((reaction) => <button key={reaction} className={`cursor-pointer border px-3 py-2 text-[10px] ${progress.reaction === reaction ? "border-pulse bg-[#2a0d0b] text-[#ff9b94]" : "border-line text-muted hover:border-white/40"}`} onClick={() => updateFeedback({ reaction: progress.reaction === reaction ? null : reaction })}>{reaction}</button>)}
      </div>}

      {media.episodes && media.episodes.length > 0 && <section className="mt-12">
        <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-bold tracking-[.14em] text-pulse uppercase">Progress</p><h2 className="mt-2 font-serif text-3xl">Episodes</h2></div><span className="text-xs text-muted">{progress?.watchedEpisodes.length ?? 0}/{media.episodes.length} watched</span></div>
        <ol className="grid gap-1">{media.episodes.map((episode) => {
          const watched = progress?.watchedEpisodes.includes(episode.episodeNumber) ?? false;
          return <li key={episode.episodeNumber}><button className={`grid w-full cursor-pointer grid-cols-[36px_1fr_auto] items-center gap-3 border p-3 text-left ${watched ? "border-[#582b28] bg-[#170e0d]" : "border-line hover:border-white/30"}`} onClick={() => toggleEpisode(episode.episodeNumber)}><span className="font-serif text-lg text-muted">{String(episode.episodeNumber).padStart(2, "0")}</span><span><strong className="block text-sm">{episode.name}</strong><small className="line-clamp-1 text-muted">{episode.overview || episode.airDate}</small></span><Check className={watched ? "text-pulse" : "text-faint"} size={17} /></button></li>;
        })}</ol>
      </section>}
    </div>
  );
}
