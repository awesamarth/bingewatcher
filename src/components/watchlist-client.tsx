"use client";

import Image from "next/image";
import Link from "next/link";
import { Film, Trash2, Tv } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { WatchlistItem } from "@/lib/types";

const key = (item: WatchlistItem) => `${item.mediaType}:${item.tmdbId}:${item.seasonNumber ?? "all"}`;
const href = (item: WatchlistItem) => `/title/${item.mediaType}/${item.tmdbId}?${item.mediaType === "tv" && item.seasonNumber !== null ? `season=${item.seasonNumber}&` : ""}from=${encodeURIComponent("/watchlist")}`;

export function WatchlistClient() {
  const [items, setItems] = useState<WatchlistItem[] | null>(null);
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/watchlist").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load your watchlist");
      setItems(body.items);
      setError("");
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load your watchlist"));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("bingewatcher:library-refresh", load);
    return () => window.removeEventListener("bingewatcher:library-refresh", load);
  }, [load]);

  async function remove(item: WatchlistItem) {
    const itemKey = key(item);
    setRemoving(itemKey);
    setError("");
    try {
      const response = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaType: item.mediaType, tmdbId: item.tmdbId, seasonNumber: item.seasonNumber }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not update your watchlist");
      setItems((current) => current?.filter((saved) => key(saved) !== itemKey) ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your watchlist");
    } finally {
      setRemoving("");
    }
  }

  return (
    <section className="mx-auto min-h-screen max-w-360 px-5 pt-36 pb-24 sm:px-[7vw] sm:pt-44">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-10">
        <div><p className="text-[10px] font-bold tracking-[.16em] text-pulse uppercase">Saved for later</p><h1 className="mt-3 font-serif text-[clamp(58px,9vw,112px)] leading-[.85] tracking-[-.065em]">Your watchlist.</h1><p className="mt-6 max-w-145 text-sm leading-relaxed text-muted">Everything you want to come back to, kept in one place.</p></div>
        {items && <p className="text-xs text-muted"><strong className="mr-1 text-xl font-normal text-white">{items.length}</strong> saved</p>}
      </div>

      {error && <p className="mb-8 border border-[#51322f] bg-[#1d1110] px-4 py-3 text-sm text-[#efbbb6]" role="alert">{error}</p>}
      {items === null ? <p className="py-10 text-sm text-muted">Loading your watchlist…</p> : items.length === 0 ? (
        <div className="py-14"><h2 className="font-serif text-4xl">Nothing saved yet.</h2><p className="mt-3 text-sm text-muted">Explore movies and series, then bookmark anything worth remembering.</p><Link className="mt-7 inline-flex min-h-11 items-center bg-pulse px-5 text-sm font-semibold text-white hover:bg-[#f1322b]" href="/explore">Explore titles</Link></div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:grid-cols-4 sm:gap-5 lg:grid-cols-6 xl:grid-cols-7">
          {items.map((item) => <article className="group relative min-w-0" key={key(item)}>
            <Link className="block" href={href(item)} aria-label={`View ${item.title}`}>
              <div className="relative aspect-2/3 overflow-hidden bg-[#191817]">
                {item.posterPath ? <Image className="object-cover transition duration-500 group-hover:scale-[1.035]" src={`https://image.tmdb.org/t/p/w500${item.posterPath}`} alt={`Poster for ${item.title}`} fill sizes="(max-width: 640px) 44vw, 220px" /> : <div className="grid h-full place-items-center text-faint">{item.mediaType === "tv" ? <Tv /> : <Film />}</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="pt-3"><div className="flex items-start justify-between gap-2"><h2 className="line-clamp-1 text-sm font-semibold text-[#eee9e4]">{item.title}</h2><span className="shrink-0 text-[9px] font-bold tracking-wider text-[#9b948e] uppercase">{item.seasonNumber !== null ? `S${item.seasonNumber}` : item.mediaType === "tv" ? "Series" : "Movie"}</span></div><p className="mt-1 text-[11px] text-[#77716c]">{item.year ?? "Date TBA"}{item.voteAverage !== null ? ` · ${item.voteAverage.toFixed(1)} TMDB` : ""}</p></div>
            </Link>
            <button className="absolute top-2 right-2 grid size-9 cursor-pointer place-items-center border border-white/20 bg-black/80 text-white backdrop-blur hover:border-pulse hover:text-[#ff8f89] disabled:cursor-wait disabled:opacity-50 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-visible:opacity-100" onClick={() => remove(item)} disabled={removing === key(item)} title="Remove from watchlist" aria-label={`Remove ${item.title} from watchlist`}><Trash2 size={16} /></button>
          </article>)}
        </div>
      )}
    </section>
  );
}
