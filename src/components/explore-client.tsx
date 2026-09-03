"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Check, Film, Plus, Search, Trash2, Tv, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { dropdownInputClass, FilterMenu, SelectMenu } from "@/components/dropdown";
import type { MediaSearchResult, MediaType, Program, WatchlistItem } from "@/lib/types";

type Genre = { id: number; name: string };
type Provider = { id: number; name: string; logoPath: string | null };
type Lineup = { id: string; title: string; targetSize: number; itemCount: number };
type LoadedLineup = Pick<Program, "version" | "items">;
type InitialFilters = { query?: string; mediaType?: MediaType | "all"; genreIds?: number[]; providerIds?: number[]; language?: string; yearMin?: number; yearMax?: number; runtimeMin?: number; runtimeMax?: number; region?: string; sort?: string };

const languages = [["", "Any language"], ["en", "English"], ["hi", "Hindi"], ["es", "Spanish"], ["fr", "French"], ["ja", "Japanese"], ["ko", "Korean"], ["de", "German"], ["it", "Italian"], ["zh", "Chinese"]] as const;
const regions = [["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"], ["CA", "Canada"], ["AU", "Australia"], ["DE", "Germany"], ["FR", "France"], ["JP", "Japan"], ["KR", "South Korea"]] as const;

async function json<T>(input: Response | Promise<Response>): Promise<T> {
  const response = await input;
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`);
  return data as T;
}

function key(media: Pick<MediaSearchResult, "mediaType" | "tmdbId" | "seasonNumber">) {
  return `${media.mediaType}:${media.tmdbId}:${media.seasonNumber ?? "all"}`;
}

function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
}

function MediaCard({ media, saved, onSave, onLineup }: { media: MediaSearchResult; saved: boolean; onSave: () => void; onLineup: () => void }) {
  return (
    <article className="group relative min-w-0">
      <Link className="block" href={`/title/${media.mediaType}/${media.tmdbId}`} aria-label={`View ${media.title}`}>
        <div className="relative aspect-[2/3] overflow-hidden bg-[#191817]">
          {media.posterPath ? <Image className="object-cover transition duration-500 group-hover:scale-[1.035]" src={`https://image.tmdb.org/t/p/w500${media.posterPath}`} alt={`Poster for ${media.title}`} fill sizes="(max-width: 640px) 44vw, 220px" /> : <div className="grid h-full place-items-center text-faint">{media.mediaType === "tv" ? <Tv /> : <Film />}</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="pt-3">
          <div className="flex items-start justify-between gap-2"><h3 className="line-clamp-1 text-sm font-semibold text-[#eee9e4]">{media.title}</h3><span className="shrink-0 text-[9px] font-bold tracking-wider text-[#9b948e] uppercase">{media.mediaType === "tv" ? "Series" : "Movie"}</span></div>
          <p className="mt-1 text-[11px] text-[#77716c]">{media.year ?? "Date TBA"}{media.voteAverage != null ? ` · ${media.voteAverage.toFixed(1)} TMDB` : ""}</p>
        </div>
      </Link>
      <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <button className={`grid size-9 cursor-pointer place-items-center border backdrop-blur ${saved ? "border-pulse bg-[#2a0d0b] text-[#ff8f89]" : "border-white/20 bg-black/75 hover:border-white/60"}`} onClick={onSave} title={saved ? "Remove from watchlist" : "Add to watchlist"} aria-label={saved ? `Remove ${media.title} from watchlist` : `Add ${media.title} to watchlist`}>{saved ? <Check size={16} /> : <Bookmark size={16} />}</button>
        <button className="grid size-9 cursor-pointer place-items-center border border-white/20 bg-black/75 backdrop-blur hover:border-pulse hover:text-[#ff8f89]" onClick={onLineup} title="Add to lineup" aria-label={`Add ${media.title} to a lineup`}><Plus size={17} /></button>
      </div>
    </article>
  );
}

function Shelf({ title, eyebrow, items, saved, onSave, onLineup, moreUrl, infinite = false, totalPages = 1 }: { title: string; eyebrow: string; items: MediaSearchResult[]; saved: Set<string>; onSave: (media: MediaSearchResult) => void; onLineup: (media: MediaSearchResult) => void; moreUrl?: string; infinite?: boolean; totalPages?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const [moreItems, setMoreItems] = useState<MediaSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const loadedMore = useRef(false);
  const loadSentinel = useRef<HTMLDivElement>(null);
  const collapseArea = useRef<HTMLDivElement>(null);
  const moreStart = useRef<HTMLDivElement>(null);
  const collapsedEnd = useRef<HTMLDivElement>(null);
  const collapseAnimation = useRef<Animation | null>(null);
  const allItems = [...items, ...moreItems].filter((media, index, all) => all.findIndex((item) => key(item) === key(media)) === index);
  const hasMore = page < totalPages;

  const loadPage = useCallback(async (nextPage: number) => {
    if (!moreUrl || loadingMore) return false;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const separator = moreUrl.includes("?") ? "&" : "?";
      const result = await json<{ results: MediaSearchResult[] }>(fetch(`${moreUrl}${separator}page=${nextPage}`));
      setMoreItems((current) => [...current, ...result.results]);
      setPage(nextPage);
      return true;
    } catch {
      setLoadError(true);
      return false;
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, moreUrl]);

  useEffect(() => {
    if (!expanded) return;
    const frame = window.requestAnimationFrame(() => moreStart.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }));
    return () => window.cancelAnimationFrame(frame);
  }, [expanded]);

  useEffect(() => () => collapseAnimation.current?.cancel(), []);

  useEffect(() => {
    if (!infinite || !hasMore || loadError) return;
    const sentinel = loadSentinel.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadPage(page + 1);
    }, { rootMargin: "600px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, infinite, loadError, loadPage, page]);

  if (!items.length) return null;

  async function viewMore() {
    if (!loadedMore.current && moreUrl && !await loadPage(2)) return;
    loadedMore.current = true;
    setExpanded(true);
  }

  function viewLess() {
    const area = collapseArea.current;
    const lastVisible = collapsedEnd.current;
    if (!area || !lastVisible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setExpanded(false);
      return;
    }
    setCollapsing(true);
    const collapsedHeight = lastVisible.getBoundingClientRect().bottom - area.getBoundingClientRect().top;
    const animation = area.animate([{ height: `${area.offsetHeight}px` }, { height: `${collapsedHeight}px` }], { duration: 650, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    collapseAnimation.current = animation;
    animation.onfinish = () => {
      flushSync(() => {
        setExpanded(false);
        setCollapsing(false);
      });
      animation.cancel();
      collapseAnimation.current = null;
    };
  }

  return (
    <section className="scroll-mt-20 [overflow-anchor:none] px-5 py-10 sm:px-[5vw] sm:py-14">
      <div className="mb-7 flex items-end justify-between gap-5">
        <div><p className="mb-2 text-[10px] font-semibold tracking-[.16em] text-pulse uppercase">{eyebrow}</p><h2 className="font-serif text-4xl tracking-[-.035em] sm:text-5xl">{title}</h2></div>
        {!infinite && !expanded && (moreUrl || items.length > 14) && <button className="mb-1 shrink-0 cursor-pointer border-b border-white/35 pb-1 text-[11px] font-semibold text-[#c7c1bb] hover:border-pulse hover:text-white disabled:opacity-50" onClick={viewMore} disabled={loadingMore} aria-expanded={false}>{loadingMore ? "Loading…" : "View more"}</button>}
      </div>
      <div ref={collapseArea} className="overflow-hidden">
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-5 lg:grid-cols-6 xl:grid-cols-7">
          {(infinite || expanded ? allItems : items.slice(0, 14)).map((media, index) => <div key={key(media)} ref={index === 14 ? moreStart : index === Math.min(13, items.length - 1) ? collapsedEnd : undefined}><MediaCard media={media} saved={saved.has(key(media))} onSave={() => onSave(media)} onLineup={() => onLineup(media)} /></div>)}
        </div>
        {infinite && hasMore && <div ref={loadSentinel} className="mt-8 flex h-10 items-center justify-center text-[11px] text-muted" aria-live="polite">{loadError ? <button className="cursor-pointer border-b border-white/35 pb-1 font-semibold hover:border-pulse hover:text-white" onClick={() => void loadPage(page + 1)}>Couldn’t load more · Retry</button> : loadingMore ? "Loading more…" : ""}</div>}
        {!infinite && expanded && <div className="mt-10 flex h-5 justify-center"><button className="cursor-pointer border-b border-white/35 pb-1 text-[11px] font-semibold text-[#c7c1bb] hover:border-pulse hover:text-white disabled:opacity-50" onClick={viewLess} disabled={collapsing} aria-expanded={true}>View less</button></div>}
      </div>
    </section>
  );
}

export function ExploreClient({ trending, trendingMovies, trendingShows, movies, shows, genres, providers, initial = {} }: { trending: MediaSearchResult[]; trendingMovies: MediaSearchResult[]; trendingShows: MediaSearchResult[]; movies: MediaSearchResult[]; shows: MediaSearchResult[]; genres: Genre[]; providers: Provider[]; initial?: InitialFilters }) {
  const [mediaType, setMediaType] = useState<MediaType | "all">(initial.mediaType ?? "all");
  const [query, setQuery] = useState(initial.query ?? "");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MediaSearchResult[]>([]);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [filteredResults, setFilteredResults] = useState<MediaSearchResult[]>([]);
  const [filteredTotalPages, setFilteredTotalPages] = useState(1);
  const [genreOptions, setGenreOptions] = useState(genres);
  const [providerOptions, setProviderOptions] = useState(providers);
  const [providerSearch, setProviderSearch] = useState("");
  const [genreIds, setGenreIds] = useState<number[]>(initial.genreIds ?? []);
  const [providerIds, setProviderIds] = useState<number[]>(initial.providerIds ?? []);
  const [language, setLanguage] = useState(initial.language ?? "");
  const [yearMin, setYearMin] = useState<number | undefined>(initial.yearMin);
  const [yearMax, setYearMax] = useState<number | undefined>(initial.yearMax);
  const [runtimeMin, setRuntimeMin] = useState<number | undefined>(initial.runtimeMin);
  const [runtimeMax, setRuntimeMax] = useState<number | undefined>(initial.runtimeMax);
  const [region, setRegion] = useState(initial.region ?? "IN");
  const [sort, setSort] = useState(initial.sort ?? "popularity.desc");
  const [filtering, setFiltering] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [recommendations, setRecommendations] = useState<MediaSearchResult[]>([]);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [lineupDetails, setLineupDetails] = useState<Record<string, LoadedLineup>>({});
  const [lineupsLoading, setLineupsLoading] = useState(false);
  const [lineupBusy, setLineupBusy] = useState<string | null>(null);
  const [messageLineup, setMessageLineup] = useState("");
  const [selected, setSelected] = useState<MediaSearchResult | null>(null);
  const [message, setMessage] = useState("");
  const lineupDialog = useRef<HTMLDialogElement>(null);
  const saved = useMemo(() => new Set(watchlist.map(key)), [watchlist]);

  useEffect(() => {
    const refresh = () => Promise.all([
      json<{ items: WatchlistItem[] }>(fetch("/api/watchlist")),
      json<{ results: MediaSearchResult[] }>(fetch("/api/recommendations")),
      json<{ programs: Lineup[] }>(fetch("/api/programs")),
    ]).then(([list, recommended, owned]) => {
      setWatchlist(list.items);
      setRecommendations(recommended.results);
      setLineups(owned.programs);
    }).catch(() => {});
    refresh();
    window.addEventListener("bingewatcher:library-refresh", refresh);
    return () => window.removeEventListener("bingewatcher:library-refresh", refresh);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 4) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const type = mediaType === "all" ? "" : `&type=${mediaType}`;
        const result = await json<{ results: MediaSearchResult[]; totalPages: number }>(await fetch(`/api/media/search?q=${encodeURIComponent(term)}${type}`, { signal: controller.signal }));
        setSearchResults(result.results);
        setSearchTotalPages(result.totalPages);
      } catch {
        if (!controller.signal.aborted) { setSearchResults([]); setSearchTotalPages(1); }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, mediaType]);

  const hasFilters = genreIds.length > 0 || providerIds.length > 0 || !!language || !!yearMin || !!yearMax || !!runtimeMin || !!runtimeMax || sort !== "popularity.desc";
  const discoverQuery = useMemo(() => {
    const params = new URLSearchParams({ region, sort });
    if (mediaType !== "all") params.set("type", mediaType);
    if (genreIds.length) params.set("genres", genreIds.join(","));
    if (providerIds.length) params.set("providers", providerIds.join(","));
    if (language) params.set("language", language);
    if (yearMin) params.set("yearMin", String(yearMin));
    if (yearMax) params.set("yearMax", String(yearMax));
    if (runtimeMin) params.set("runtimeMin", String(runtimeMin));
    if (runtimeMax) params.set("runtimeMax", String(runtimeMax));
    return params.toString();
  }, [genreIds, language, mediaType, providerIds, region, runtimeMax, runtimeMin, sort, yearMax, yearMin]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setFiltering(hasFilters);
      try {
        const result = await json<{ results: MediaSearchResult[]; totalPages?: number; genres?: Genre[]; providers?: Provider[] }>(fetch(`/api/media/discover?${discoverQuery}`, { signal: controller.signal }));
        if (result.genres) setGenreOptions(result.genres);
        if (result.providers) setProviderOptions(result.providers);
        setFilteredResults(hasFilters ? result.results : []);
        setFilteredTotalPages(hasFilters ? result.totalPages ?? 1 : 1);
      } catch {
        if (!controller.signal.aborted && hasFilters) { setFilteredResults([]); setFilteredTotalPages(1); }
      } finally {
        if (!controller.signal.aborted) setFiltering(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [discoverQuery, hasFilters]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    else {
      if (mediaType !== "all") params.set("type", mediaType);
      if (genreIds.length) params.set("genres", genreIds.join(","));
      if (providerIds.length) params.set("providers", providerIds.join(","));
      if (language) params.set("language", language);
      if (yearMin) params.set("yearMin", String(yearMin));
      if (yearMax) params.set("yearMax", String(yearMax));
      if (runtimeMin) params.set("runtimeMin", String(runtimeMin));
      if (runtimeMax) params.set("runtimeMax", String(runtimeMax));
      if (region !== "IN") params.set("region", region);
      if (sort !== "popularity.desc") params.set("sort", sort);
    }
    window.history.replaceState(null, "", `/explore${params.size ? `?${params}` : ""}`);
  }, [genreIds, language, mediaType, providerIds, query, region, runtimeMax, runtimeMin, sort, yearMax, yearMin]);

  function clearFilters() {
    setGenreIds([]);
    setProviderIds([]);
    setLanguage("");
    setYearMin(undefined);
    setYearMax(undefined);
    setRuntimeMin(undefined);
    setRuntimeMax(undefined);
    setSort("popularity.desc");
  }

  function toggleFilter(value: number, selected: number[], update: (values: number[]) => void) {
    setQuery("");
    update(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  async function toggleWatchlist(media: MediaSearchResult) {
    const isSaved = saved.has(key(media));
    await json(await fetch("/api/watchlist", { method: isSaved ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(media) }));
    setWatchlist((items) => isSaved ? items.filter((item) => key(item) !== key(media)) : [{ ...media, runtime: null, genres: [], providers: [], trailerKey: null, episodeCount: null, seasonCount: null, addedAt: new Date().toISOString() }, ...items]);
  }

  function openLineups(media: MediaSearchResult) {
    setSelected(media);
    setMessage("");
    setMessageLineup("");
    lineupDialog.current?.showModal();
    setLineupsLoading(true);
    void Promise.all(lineups.map(async (lineup) => [lineup.id, (await json<{ program: LoadedLineup }>(fetch(`/api/programs/${lineup.id}`))).program] as const))
      .then((entries) => setLineupDetails(Object.fromEntries(entries)))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load your lineups"))
      .finally(() => setLineupsLoading(false));
  }

  function selectedItems(lineupId: string) {
    if (!selected) return [];
    return (lineupDetails[lineupId]?.items ?? []).filter((item) => item.mediaType === selected.mediaType && item.tmdbId === selected.tmdbId && item.seasonNumber === selected.seasonNumber);
  }

  async function updateLineup(lineup: Lineup, mode: "add" | "remove") {
    if (!selected) return;
    setLineupBusy(lineup.id);
    setMessage("");
    setMessageLineup("");
    try {
      const current = await json<{ program: LoadedLineup }>(fetch(`/api/programs/${lineup.id}`));
      const included = current.program.items.filter((item) => item.mediaType === selected.mediaType && item.tmdbId === selected.tmdbId && item.seasonNumber === selected.seasonNumber);
      const result = await json<{ program: LoadedLineup }>(fetch(`/api/programs/${lineup.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "remove"
          ? { action: "remove_media", actor: "human", expectedVersion: current.program.version, itemId: included[0]?.id }
          : { action: "add_media", actor: "human", expectedVersion: current.program.version, mediaType: selected.mediaType, tmdbId: selected.tmdbId, seasonNumber: selected.seasonNumber, explanation: "" }),
      }));
      setLineupDetails((details) => ({ ...details, [lineup.id]: result.program }));
      setLineups((items) => items.map((item) => item.id === lineup.id ? { ...item, itemCount: result.program.items.length } : item));
      setMessage(`${mode === "remove" ? "Removed from" : "Added to"} ${lineup.title}.`);
      setMessageLineup(mode === "add" ? lineup.id : "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update this lineup");
    } finally {
      setLineupBusy(null);
    }
  }

  const typedTrending = mediaType === "all" ? trending : mediaType === "movie" ? trendingMovies : trendingShows;
  const discoveryItems = query.trim().length >= 4 ? searchResults : hasFilters ? filteredResults : [];
  const discoveryTotalPages = query.trim().length >= 4 ? searchTotalPages : filteredTotalPages;
  const typeParam = mediaType === "all" ? "" : `type=${mediaType}&`;
  const discoveryMoreUrl = query.trim().length >= 4 ? `/api/media/search?q=${encodeURIComponent(query.trim())}&${typeParam}` : hasFilters ? `/api/media/discover?${discoverQuery}` : undefined;
  const filterCount = genreIds.length + providerIds.length + Number(!!language) + Number(!!yearMin || !!yearMax) + Number(!!runtimeMin || !!runtimeMax) + Number(sort !== "popularity.desc");

  return (
    <>
      <header className="relative border-b border-line px-5 py-16 sm:px-[7vw] sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(180,42,35,.15),transparent_35%)]" />
        <div className="relative mx-auto max-w-360">
          <p className="mb-4 text-[11px] font-semibold tracking-[.18em] text-pulse uppercase">Find what pulls you in</p>
          <h1 className="max-w-230 font-serif text-[clamp(52px,9vw,128px)] leading-[.86] tracking-[-.065em] sm:leading-[.82]">Explore your<span className="hidden sm:inline"> next</span><br /><span className="sm:hidden">next </span>obsession.</h1>
          <div className="mt-10 grid max-w-220 grid-cols-[28px_1fr_auto] items-center border-b border-[#5b544e] py-3"><Search size={19} /><input className="min-w-0 bg-transparent py-2 text-base text-white outline-none sm:text-lg" value={query} onChange={(event) => { const value = event.target.value; if (!query && value) clearFilters(); setQuery(value); if (value.trim().length < 4) setSearchResults([]); }} placeholder="Search by title…" aria-label="Search movies and shows by title" /><span aria-live="polite" className="text-[10px] text-muted">{searching ? "Searching…" : query.trim().length > 0 && query.trim().length < 4 ? "Type 4 characters" : ""}</span></div>
          <div className="mt-6 flex flex-wrap gap-2">
            {(["all", "movie", "tv"] as const).map((type) => <button key={type} className={`cursor-pointer border px-4 py-2 text-[10px] font-semibold tracking-wider uppercase ${mediaType === type ? "border-pulse bg-[#2a0d0b] text-[#ff9b94]" : "border-line text-muted hover:border-white/40"}`} onClick={() => setMediaType(type)}>{type === "all" ? "All" : type === "movie" ? "Movies" : "TV shows"}</button>)}
          </div>
          <div className="mt-5 flex max-w-290 flex-wrap gap-2">
            <FilterMenu label="Genres" count={genreIds.length}><div className="-mr-2 max-h-72 space-y-1 overflow-y-auto pr-3">{genreOptions.map((genre) => <label key={genre.id} className="flex cursor-pointer items-center justify-between px-1.5 py-1.5 text-[13px] text-[#c7c1bb] hover:bg-white/5 hover:text-white"><span>{genre.name}</span><input className="size-3.5 accent-[#e63b33]" type="checkbox" checked={genreIds.includes(genre.id)} onChange={() => toggleFilter(genre.id, genreIds, setGenreIds)} /></label>)}</div></FilterMenu>
            <FilterMenu label="Streaming on" count={providerIds.length}><input className={`${dropdownInputClass} mb-3 w-full`} value={providerSearch} onChange={(event) => setProviderSearch(event.target.value)} placeholder="Find a service…" aria-label="Find a streaming service" /><div className="-mr-2 max-h-72 space-y-1 overflow-y-auto pr-3">{providerOptions.filter((provider) => provider.name.toLowerCase().includes(providerSearch.toLowerCase())).map((provider) => <label key={provider.id} className="flex cursor-pointer items-center justify-between px-1.5 py-2 text-[13px] text-[#c7c1bb] hover:bg-white/5 hover:text-white"><span>{provider.name}</span><input className="size-3.5 accent-[#e63b33]" type="checkbox" checked={providerIds.includes(provider.id)} onChange={() => toggleFilter(provider.id, providerIds, setProviderIds)} /></label>)}</div></FilterMenu>
            <SelectMenu value={language} options={languages.map(([value, label]) => ({ value, label }))} onChange={(value) => { setQuery(""); setLanguage(value); }} ariaLabel="Original language" />
            <FilterMenu label="Release years" count={Number(!!yearMin || !!yearMax)}><div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-[10px] tracking-wider text-muted uppercase">From<input className={dropdownInputClass} type="number" min="1870" max="2100" value={yearMin ?? ""} placeholder="1990" onChange={(event) => { setQuery(""); setYearMin(event.target.value ? Number(event.target.value) : undefined); }} /></label><label className="grid gap-2 text-[10px] tracking-wider text-muted uppercase">To<input className={dropdownInputClass} type="number" min="1870" max="2100" value={yearMax ?? ""} placeholder="2000" onChange={(event) => { setQuery(""); setYearMax(event.target.value ? Number(event.target.value) : undefined); }} /></label></div></FilterMenu>
            <FilterMenu label="Runtime" count={Number(!!runtimeMin || !!runtimeMax)}><div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-[10px] tracking-wider text-muted uppercase">Min<input className={dropdownInputClass} type="number" min="1" max="1000" value={runtimeMin ?? ""} placeholder="60" onChange={(event) => { setQuery(""); setRuntimeMin(event.target.value ? Number(event.target.value) : undefined); }} /></label><label className="grid gap-2 text-[10px] tracking-wider text-muted uppercase">Max<input className={dropdownInputClass} type="number" min="1" max="1000" value={runtimeMax ?? ""} placeholder="120" onChange={(event) => { setQuery(""); setRuntimeMax(event.target.value ? Number(event.target.value) : undefined); }} /></label><p className="col-span-2 text-[10px] text-faint">Minutes per movie or episode.</p></div></FilterMenu>
            <SelectMenu value={region} options={regions.map(([value, label]) => ({ value, label }))} onChange={(value) => { setRegion(value); setProviderIds([]); }} ariaLabel="Streaming region" />
            <SelectMenu value={sort} options={[{ value: "popularity.desc", label: "Most popular" }, { value: "vote_average.desc", label: "Highest rated" }, { value: "date.desc", label: "Newest first" }]} onChange={(value) => { setQuery(""); setSort(value); }} ariaLabel="Sort discoveries" />
          </div>
          {filterCount > 0 && <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-[#aaa39d]"><span>{filterCount} filter{filterCount === 1 ? "" : "s"} active</span>{genreIds.map((id) => <button key={`genre-${id}`} className="cursor-pointer border border-line px-2 py-1 hover:border-pulse hover:text-white" onClick={() => setGenreIds((values) => values.filter((value) => value !== id))}>{genreOptions.find((genre) => genre.id === id)?.name ?? "Genre"} ×</button>)}{providerIds.map((id) => <button key={`provider-${id}`} className="cursor-pointer border border-line px-2 py-1 hover:border-pulse hover:text-white" onClick={() => setProviderIds((values) => values.filter((value) => value !== id))}>{providerOptions.find((provider) => provider.id === id)?.name ?? "Provider"} ×</button>)}{language && <button className="cursor-pointer border border-line px-2 py-1 hover:border-pulse hover:text-white" onClick={() => setLanguage("")}>{languages.find(([code]) => code === language)?.[1]} ×</button>}{(yearMin || yearMax) && <button className="cursor-pointer border border-line px-2 py-1 hover:border-pulse hover:text-white" onClick={() => { setYearMin(undefined); setYearMax(undefined); }}>{yearMin ?? "Any"}–{yearMax ?? "Now"} ×</button>}{(runtimeMin || runtimeMax) && <button className="cursor-pointer border border-line px-2 py-1 hover:border-pulse hover:text-white" onClick={() => { setRuntimeMin(undefined); setRuntimeMax(undefined); }}>{runtimeMin ?? 0}–{runtimeMax ?? "Any"} min ×</button>}{sort !== "popularity.desc" && <button className="cursor-pointer border border-line px-2 py-1 hover:border-pulse hover:text-white" onClick={() => setSort("popularity.desc")}>{sort === "vote_average.desc" ? "Highest rated" : "Newest first"} ×</button>}<button className="cursor-pointer text-pulse hover:text-[#ff8f89]" onClick={clearFilters}>Clear all</button></div>}
        </div>
      </header>

      {discoveryItems.length > 0 && <Shelf key={discoveryMoreUrl} title={query ? `Results for “${query.trim()}”` : "Search results"} eyebrow={filtering || searching ? "Searching…" : "Discovery"} items={discoveryItems} saved={saved} onSave={toggleWatchlist} onLineup={openLineups} moreUrl={discoveryMoreUrl} infinite totalPages={discoveryTotalPages} />}
      {(query.trim().length >= 4 || hasFilters) && !filtering && !searching && discoveryItems.length === 0 && <section className="px-5 py-16 sm:px-[5vw]"><p className="text-[10px] font-semibold tracking-[.16em] text-pulse uppercase">No matches</p><h2 className="mt-2 font-serif text-4xl">Try loosening a filter.</h2></section>}
      {query.trim().length < 4 && !hasFilters && <>
        <Shelf key={`trending-${mediaType}`} title="Trending this week" eyebrow="Right now" items={typedTrending} saved={saved} onSave={toggleWatchlist} onLineup={openLineups} moreUrl={`/api/media/discover?trending=true&${typeParam}`} />
        {recommendations.length > 0 && <Shelf title="Picked from your taste" eyebrow="For you" items={recommendations} saved={saved} onSave={toggleWatchlist} onLineup={openLineups} moreUrl="/api/recommendations" />}
        <Shelf title="Movies people can’t stop watching" eyebrow="Popular movies" items={movies} saved={saved} onSave={toggleWatchlist} onLineup={openLineups} moreUrl="/api/media/discover?type=movie&popular=true" />
        <Shelf title="One more episode" eyebrow="Popular series" items={shows} saved={saved} onSave={toggleWatchlist} onLineup={openLineups} moreUrl="/api/media/discover?type=tv&popular=true" />
      </>}

      <dialog ref={lineupDialog} className="m-auto w-[min(560px,calc(100vw-32px))] border border-[#35312e] bg-[#11100f] p-7 text-ink shadow-[0_40px_140px_#000] outline-none sm:p-10" onMouseDown={closeOnBackdrop}>
        <button className="absolute top-4 right-4 grid size-9 cursor-pointer place-items-center border border-line" onClick={() => lineupDialog.current?.close()} aria-label="Close"><X size={16} /></button>
        <p className="text-[10px] font-bold tracking-[.15em] text-pulse uppercase">Add to lineup</p>
        <h2 className="mt-3 mb-7 font-serif text-4xl">{selected?.title}</h2>
        {lineups.length ? <div className="grid gap-2">{lineups.map((lineup) => {
          const included = selectedItems(lineup.id);
          const disabled = lineupsLoading || lineupBusy !== null;
          return <div key={lineup.id} className="flex items-center justify-between gap-3 border border-line p-4"><span className="min-w-0"><strong className="block truncate text-sm">{lineup.title}</strong><small className="text-muted">{lineup.itemCount}/{lineup.targetSize} picks{included.length > 0 ? ` · Added${included.length > 1 ? ` ${included.length}×` : ""}` : ""}</small></span><span className="flex w-35 shrink-0 justify-end gap-1">{included.length > 0 && <button className="grid size-9 cursor-pointer place-items-center border border-pulse/60 text-[#ff9b94] hover:bg-[#2a0d0b] disabled:opacity-40" disabled={disabled} onClick={() => updateLineup(lineup, "remove")} title="Remove one" aria-label={`Remove ${selected?.title} from ${lineup.title}`}><Trash2 size={15} /></button>}<button className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap bg-pulse px-3 text-xs font-semibold text-white disabled:opacity-40" disabled={disabled} onClick={() => updateLineup(lineup, "add")}><Plus size={15} />{included.length > 0 ? "Add again" : "Add"}</button></span></div>;
        })}</div> : <p className="text-sm text-muted">Build a lineup first, then add this title to it. <Link className="font-semibold text-white underline decoration-white/35 underline-offset-4 hover:decoration-pulse" href="/lineups/new">New lineup →</Link></p>}
        <p className="mt-4 min-h-5 text-sm text-[#e7b2ad]" role="status">{message}{messageLineup && <> <Link className="font-semibold text-white underline decoration-white/35 underline-offset-4 hover:decoration-pulse" href={`/program/${messageLineup}`}>View lineup →</Link></>}</p>
      </dialog>
    </>
  );
}
