"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type MouseEvent as ReactMouseEvent } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  Clock3,
  GripVertical,
  History,
  ListFilter,
  Lock,
  LockOpen,
  MessageSquareQuote,
  Play,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { SiteNav } from "./site-nav";
import { WebMCPTools } from "./webmcp-tools";
import type { Constraints, MediaSearchResult, Program, ProgramItem, Veto } from "@/lib/types";

type ProgramResponse = { program: Program; validation: { valid: boolean; issues: string[] } };
type SearchResponse = { results: MediaSearchResult[] };

const eyebrowClass = "text-[11px] font-semibold tracking-[.16em] text-[#c8c2bc] uppercase";
const primaryButtonClass = "flex min-h-10 cursor-pointer items-center justify-center gap-3 rounded-sm border-0 bg-pulse px-5.5 font-semibold text-white transition hover:-translate-y-px hover:bg-[#f1322b] disabled:cursor-wait disabled:opacity-55";
const modalClass = "m-auto max-h-[calc(100vh-32px)] w-[min(900px,calc(100vw-32px))] overflow-auto border border-[#35312e] bg-[#11100f] p-7 text-ink shadow-[0_40px_140px_#000] outline-none sm:p-14";
const modalCloseClass = "absolute top-4.5 right-4.5 grid size-9 cursor-pointer place-items-center border border-line bg-transparent [&_svg]:w-4";

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body as T;
}

function closeOnBackdrop(event: ReactMouseEvent<HTMLDialogElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
}

function FilmAction({ label, className = "", children, ...props }: ComponentProps<"button"> & { label: string }) {
  return (
    <button {...props} title={label} aria-label={label} className={`group/action relative ${className}`}>
      {children}
      <span role="tooltip" className="pointer-events-none absolute top-full right-0 z-20 mt-2 whitespace-nowrap border border-white/10 bg-[#20201e] px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100 group-focus-visible/action:opacity-100">{label}</span>
    </button>
  );
}

function SortableMovie({
  item,
  index,
  readOnly,
  onAction,
  onReplace,
  onRemove,
  onVeto,
  onTrailer,
  returnTo,
}: {
  item: ProgramItem;
  index: number;
  readOnly: boolean;
  returnTo: string;
  onAction: (input: Record<string, unknown>) => void;
  onReplace: () => void;
  onRemove: () => void;
  onVeto: () => void;
  onTrailer: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: readOnly });
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const description = item.overview;
  const titleHref = `/title/${item.mediaType}/${item.tmdbId}?${item.mediaType === "tv" && item.seasonNumber !== null ? `season=${item.seasonNumber}&` : ""}from=${encodeURIComponent(returnTo)}`;
  const actionClass = "grid size-[31px] cursor-pointer place-items-center border border-white/15 bg-black/70 backdrop-blur transition hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-30 md:size-[34px] [&_svg]:w-[15px]";
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative grid min-h-107.5 grid-cols-[48px_1fr] overflow-hidden border-b border-line bg-surface transition-[opacity,box-shadow] md:min-h-78.75 md:grid-cols-[82px_1fr] ${isDragging ? "z-30 opacity-85 shadow-[0_35px_90px_#000]" : ""}`}
    >
      {readOnly ? (
        <div className="z-4 grid place-items-center border-r border-white/12 bg-[#0b0b0a] font-serif text-xl text-white/60 md:text-[26px]">{String(index + 1).padStart(2, "0")}</div>
      ) : (
        <button type="button" className="group/drag z-4 grid cursor-grab place-items-center border-0 border-r border-white/12 bg-[#0b0b0a] font-serif text-xl text-white/60 transition hover:bg-[#171312] hover:text-[#ff8f89] active:cursor-grabbing md:text-[26px]" {...attributes} {...listeners} aria-label={`Reorder ${item.title}`}>
          <span className="group-hover/drag:hidden group-focus-visible/drag:hidden">{String(index + 1).padStart(2, "0")}</span>
          <GripVertical className="hidden group-hover/drag:block group-focus-visible/drag:block" size={22} />
        </button>
      )}
      <div className="absolute inset-y-0 right-0 left-12 overflow-hidden md:left-20.5">
        {item.backdropPath ? (
          <Image className={`object-cover transition duration-500 group-hover:scale-[1.018] ${item.watched ? "opacity-60 grayscale-75" : ""}`} src={`https://image.tmdb.org/t/p/w780${item.backdropPath}`} alt="" fill sizes="(max-width: 800px) 100vw, 760px" />
        ) : item.posterPath ? (
          <Image className={`object-cover transition duration-500 group-hover:scale-[1.018] ${item.watched ? "opacity-60 grayscale-75" : ""}`} src={`https://image.tmdb.org/t/p/w500${item.posterPath}`} alt="" fill sizes="400px" />
        ) : <div className="h-full w-full bg-[#191817]" />}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,9,.98)_0%,rgba(10,10,9,.86)_35%,rgba(10,10,9,.28)_78%,rgba(10,10,9,.55)),linear-gradient(0deg,rgba(7,7,7,.72),transparent_60%)]" />
      </div>
      <Link href={titleHref} className="absolute inset-y-0 right-0 left-12 z-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-pulse focus-visible:ring-inset focus-visible:outline-none md:left-20.5" aria-label={`View ${item.title}`} />
      <div className="pointer-events-none z-3 max-w-152.5 self-end py-7 pr-16 pl-5 md:px-8.5 md:py-9.5 md:pr-34">
        <div className="mb-3 flex flex-wrap gap-3.5">
          {item.locked && <span className="inline-flex items-center gap-1 text-[9px] font-semibold tracking-[.1em] text-[#d7958f] uppercase"><Lock size={12} /> Locked by you</span>}
          {item.addedBy === "agent" && <span className="inline-flex items-center gap-1 text-[9px] font-semibold tracking-[.1em] text-[#d7958f] uppercase"><Sparkles size={12} /> Added by agent</span>}
          {item.watched && <span className="inline-flex items-center gap-1 text-[9px] font-semibold tracking-[.1em] text-[#d7958f] uppercase"><Check size={12} /> Watched</span>}
        </div>
        <h3 className="mb-2 font-serif text-[42px] leading-[.96] font-normal tracking-[-.035em] md:text-[clamp(34px,4.2vw,58px)]">{item.title}</h3>
        <p className="mb-3.5 text-[11px] tracking-[.04em] text-[#b1aaa3]">{[item.year, item.mediaType === "tv" && item.seasonNumber !== null ? `Season ${item.seasonNumber}` : item.mediaType === "tv" ? "Series" : null, item.episodeCount && `${item.episodeCount} episodes`, item.runtime && `${item.runtime} min`, item.voteAverage != null && `${item.voteAverage.toFixed(1)} TMDB`, item.genres.slice(0, 2).join(" · ")].filter(Boolean).join("  /  ")}</p>
        <p className={`${descriptionExpanded ? "" : "line-clamp-2"} max-w-130 text-[13px] leading-[1.55] text-[#d2ccc6]`}>{description}</p>
        {description.length > 140 && <button className="pointer-events-auto mt-1.5 cursor-pointer text-[10px] font-semibold tracking-[.08em] text-[#d7958f] uppercase hover:text-white" onClick={() => setDescriptionExpanded((expanded) => !expanded)} aria-expanded={descriptionExpanded}>{descriptionExpanded ? "Show less" : "Read more"}</button>}
        {item.providers.length > 0 && <p className="mt-3 text-[10px] text-[#77716c]">Available via {item.providers.slice(0, 3).join(", ")}</p>}
        {item.reaction && <p className="mt-3 inline-flex items-center gap-2 font-serif text-[15px] text-[#e7b2ad]"><MessageSquareQuote size={14} /> {item.reaction}</p>}
        {item.watched && !readOnly && <div className="pointer-events-auto mt-3 flex gap-1" aria-label="React to this movie">
          {["Loved it", "Wild", "Not for me"].map((reaction) => <button key={reaction} onClick={() => onAction({ action: "record_reaction", itemId: item.id, reaction: item.reaction === reaction ? null : reaction })} className={`cursor-pointer border bg-black/60 px-2 py-1 text-[9px] ${item.reaction === reaction ? "border-[#a64a44] text-[#f0b5af]" : "border-[#423e3a] text-[#918b85] hover:border-[#a64a44] hover:text-[#f0b5af]"}`}>{reaction}</button>)}
        </div>}
      </div>
      <div className="absolute right-2.5 bottom-2.5 z-8 flex flex-col gap-1 opacity-100 transition-opacity md:top-4.5 md:right-4.5 md:bottom-auto md:flex-row md:opacity-25 md:group-hover:opacity-100 md:focus-within:opacity-100">
        {item.trailerKey && <FilmAction label="Watch trailer" className={actionClass} onClick={onTrailer}><Play /></FilmAction>}
        {!readOnly && <>
          <FilmAction label={item.locked ? "Unlock" : "Lock"} className={`${actionClass} ${item.locked ? "bg-[#2a0d0b] text-[#ff8f89] ring-1 ring-pulse ring-inset" : ""}`} onClick={() => onAction({ action: "set_lock", itemId: item.id, locked: !item.locked })}>{item.locked ? <Lock /> : <LockOpen />}</FilmAction>
          <FilmAction label={item.watched ? "Mark unwatched" : "Mark watched"} className={`${actionClass} ${item.watched ? "bg-[#2a0d0b] text-[#ff8f89] ring-1 ring-pulse ring-inset" : ""}`} onClick={() => onAction({ action: "mark_watched", itemId: item.id, watched: !item.watched })}><Check /></FilmAction>
          <FilmAction label="Replace" className={actionClass} onClick={onReplace} disabled={item.locked}><Search /></FilmAction>
          <FilmAction label="Remove" className={actionClass} onClick={onRemove}><Trash2 /></FilmAction>
          <FilmAction label="Not for me" className={`${actionClass} hover:border-pulse hover:text-[#ff6d66]`} onClick={onVeto}><X /></FilmAction>
        </>}
      </div>
    </article>
  );
}

export function ProgramWorkspace({ programId }: { programId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ProgramResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"constraints" | "history" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [replaceItem, setReplaceItem] = useState<ProgramItem | null>(null);
  const [removeItem, setRemoveItem] = useState<ProgramItem | null>(null);
  const [vetoItem, setVetoItem] = useState<ProgramItem | null>(null);
  const [forgetVeto, setForgetVeto] = useState<Veto | null>(null);
  const [trailer, setTrailer] = useState<ProgramItem | null>(null);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const removeDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const forgetDialog = useRef<HTMLDialogElement>(null);
  const vetoDialog = useRef<HTMLDialogElement>(null);
  const trailerDialog = useRef<HTMLDialogElement>(null);
  const shareToken = searchParams.get("share");
  const editToken = searchParams.get("edit");
  const accessSuffix = shareToken ? `?share=${encodeURIComponent(shareToken)}` : editToken ? `?edit=${encodeURIComponent(editToken)}` : "";
  const readOnly = Boolean(shareToken);

  const load = useCallback(async () => {
    try {
      setData(await responseJson(await fetch(`/api/programs/${programId}${accessSuffix}`, { cache: "no-store" })));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this lineup");
    }
  }, [programId, accessSuffix]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [load]);
  useEffect(() => {
    window.addEventListener("bingewatcher:refresh", load);
    return () => window.removeEventListener("bingewatcher:refresh", load);
  }, [load]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 4) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const result = await responseJson<SearchResponse>(await fetch(`/api/media/search?q=${encodeURIComponent(query)}`, { signal: controller.signal }));
        setSearchResults(result.results);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function action(input: Record<string, unknown>) {
    if (!data || readOnly) return;
    setBusy(true);
    setError("");
    try {
      const next = await responseJson<ProgramResponse>(await fetch(`/api/programs/${programId}/actions${accessSuffix}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, actor: "human", expectedVersion: data.program.version }),
      }));
      setData(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the lineup");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function dragEnd(event: DragEndEvent) {
    if (!data || event.over === null || event.active.id === event.over.id) return;
    const oldIndex = data.program.items.findIndex((item) => item.id === event.active.id);
    const newIndex = data.program.items.findIndex((item) => item.id === event.over?.id);
    const reordered = arrayMove(data.program.items, oldIndex, newIndex);
    setData({ ...data, program: { ...data.program, items: reordered } });
    await action({ action: "reorder_movies", itemIds: reordered.map((item) => item.id) });
  }

  function openSearch(item: ProgramItem | null = null) {
    setReplaceItem(item);
    setSearchQuery("");
    setSearchResults([]);
    searchDialog.current?.showModal();
    searchInput.current?.focus();
  }

  async function chooseMedia(media: MediaSearchResult) {
    searchDialog.current?.close();
    await action(replaceItem
      ? { action: "replace_media", itemId: replaceItem.id, mediaType: media.mediaType, tmdbId: media.tmdbId, seasonNumber: media.seasonNumber, explanation: "" }
      : { action: "add_media", mediaType: media.mediaType, tmdbId: media.tmdbId, seasonNumber: media.seasonNumber, explanation: "" });
    setReplaceItem(null);
  }

  function openRemove(item: ProgramItem) {
    setRemoveItem(item);
    removeDialog.current?.showModal();
  }

  async function confirmRemove() {
    if (!removeItem) return;
    const itemId = removeItem.id;
    removeDialog.current?.close();
    await action({ action: "remove_movie", itemId });
  }

  function openVeto(item: ProgramItem) {
    setVetoItem(item);
    vetoDialog.current?.showModal();
  }

  async function submitVeto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!vetoItem) return;
    vetoDialog.current?.close();
    await action({ action: "veto_movie", itemId: vetoItem.id, reason: form.get("reason") });
    setVetoItem(null);
  }

  async function confirmForgetVeto() {
    if (!forgetVeto) return;
    forgetDialog.current?.close();
    await action({ action: "remove_veto", mediaType: forgetVeto.mediaType, tmdbId: forgetVeto.tmdbId, seasonNumber: forgetVeto.seasonNumber });
    setForgetVeto(null);
  }

  async function updateConstraints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const list = (name: string) => String(form.get(name) ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const number = (name: string) => Number(form.get(name)) || null;
    await action({
      action: "update_constraints",
      constraints: {
        runtimeMax: number("runtimeMax"),
        languages: list("languages"),
        genres: list("genres"),
        providers: list("providers"),
        yearMin: number("yearMin"),
        yearMax: number("yearMax"),
        region: String(form.get("region") || "US"),
        notes: String(form.get("notes") || ""),
      } satisfies Constraints,
    });
    setPanel(null);
  }

  async function share() {
    if (!data) return;
    const url = `${window.location.origin}/program/${programId}?share=${data.program.shareToken}`;
    await navigator.clipboard.writeText(url);
    setError("Read-only share link copied.");
    window.setTimeout(() => setError(""), 2200);
  }

  async function confirmDelete() {
    if (!data || readOnly) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/programs/${programId}${accessSuffix}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: data.program.version }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not delete the lineup");
      deleteDialog.current?.close();
      router.replace("/lineups");
    } catch (cause) {
      deleteDialog.current?.close();
      setError(cause instanceof Error ? cause.message : "Could not delete the lineup");
    } finally {
      setBusy(false);
    }
  }

  const emptySlots = data ? Math.max(0, data.program.targetSize - data.program.items.length) : 0;
  const totalRuntime = useMemo(() => data?.program.items.reduce((total, item) => total + (item.runtime ?? 0), 0) ?? 0, [data]);

  if (!data) {
    return <main className="min-h-screen bg-canvas"><SiteNav active="lineups" /><div className="grid min-h-screen place-content-center gap-7 text-center"><div className="h-px w-45 overflow-hidden bg-[#252321]"><div className="h-full w-2/5 animate-pulse bg-pulse" /></div>{error && <p>{error}</p>}</div></main>;
  }

  const { program } = data;
  const navButtonClass = "flex size-8.5 cursor-pointer items-center justify-center gap-2 rounded-sm border border-line bg-transparent text-xs text-[#bcb6b0] hover:border-[#59534e] hover:text-white sm:w-auto sm:px-3";
  const constraintLabelClass = "grid gap-2 text-[10px] tracking-[.05em] text-[#88827d] uppercase";
  const constraintInputClass = "w-full border border-line bg-[#151413] px-3 py-2.5 text-[13px] text-white normal-case outline-none focus:border-[#72504d]";
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_70%_-10%,rgba(227,38,31,.09),transparent_30%)]" aria-busy={busy}>
      {!readOnly && <WebMCPTools programId={programId} />}
      <SiteNav active="lineups" />
      <div className="sticky top-20 z-30 mt-20 border-y border-[#363330d9] bg-[#0b0b0ae8] backdrop-blur-lg">
        <div className="mx-auto flex min-h-13 max-w-290 items-center justify-between gap-4 px-5 sm:px-7.5">
          <Link href="/lineups" className="inline-flex items-center gap-2 text-xs text-muted hover:text-white"><ArrowLeft size={16} /> All lineups</Link>
          <div className="flex items-center gap-2">
            <button className={navButtonClass} onClick={() => setPanel(panel === "constraints" ? null : "constraints")}><ListFilter size={17} /><span className="hidden sm:inline">Preferences</span></button>
            <button className={navButtonClass} onClick={() => setPanel(panel === "history" ? null : "history")}><History size={17} /><span className="hidden sm:inline">History</span></button>
            {!readOnly && <><button className={navButtonClass} onClick={share}><Share2 size={17} /><span className="hidden sm:inline">Share</span></button><button className={`${navButtonClass} text-[#d88983] hover:border-pulse hover:text-[#ff9b94]`} onClick={() => deleteDialog.current?.showModal()} aria-label="Delete lineup"><Trash2 size={16} /><span className="hidden sm:inline">Delete</span></button></>}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-290 px-7.5 pt-10 pb-13 sm:pt-17">
        <div className="grid grid-cols-1 items-end gap-7 sm:grid-cols-[1fr_auto] sm:gap-12">
          <div>
            <p className={eyebrowClass}>Lineup · {program.targetSize} picks</p>
            <h1 className="my-2 max-w-200 font-serif text-6xl leading-[.9] font-normal tracking-[-.06em] sm:text-[clamp(55px,7vw,104px)]">{program.title}</h1>
            <p className="max-w-162.5 leading-[1.6] text-[#aaa39d]">{program.prompt}</p>
          </div>
          <div className={`grid min-w-42.5 ${readOnly ? "grid-cols-3" : "grid-cols-2"} gap-3 border-t border-line pt-4 text-[11px] text-[#87817c] sm:grid-cols-1 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6`}>
            <span className="flex items-center gap-2"><strong className="text-[17px] text-white">{program.items.length}</strong> / {program.targetSize} selected</span>
            <span className="flex items-center gap-2"><Clock3 size={15} /> {Math.floor(totalRuntime / 60)}h {totalRuntime % 60}m</span>
            {readOnly && <span className="flex items-center gap-2"><Lock size={14} /> Read only</span>}
          </div>
        </div>
      </section>

      {error && <div className="fixed right-6 bottom-6 z-80 flex max-w-105 items-center gap-5 border border-[#51322f] bg-[#1d1110] px-4 py-3.5 text-[13px] text-[#efbbb6] shadow-[0_20px_70px_#000]" role="status">{error}<button className="ml-auto cursor-pointer border-0 bg-transparent" onClick={() => setError("")}><X size={15} /></button></div>}

      {panel === "constraints" && (
        <section className="mx-5 mb-10 grid max-w-275 grid-cols-1 gap-6 border-y border-line bg-[#0d0d0c] px-7.5 py-10 lg:mx-auto lg:grid-cols-[300px_1fr] lg:gap-20">
          <div><span className={eyebrowClass}>Guardrails</span><h2 className="my-2 font-serif text-[34px] font-normal">Lineup preferences</h2><p className="text-[13px] leading-relaxed text-muted">Your lineup and any connected agent will follow these preferences.</p></div>
          <form className="grid grid-cols-2 gap-5 lg:grid-cols-3" onSubmit={updateConstraints}>
            <label className={constraintLabelClass}>Max runtime<input className={constraintInputClass} name="runtimeMax" type="number" min="30" max="400" defaultValue={program.constraints.runtimeMax ?? ""} placeholder="minutes" /></label>
            <label className={constraintLabelClass}>Release years<div className="grid grid-cols-2 gap-2"><input className={constraintInputClass} name="yearMin" type="number" defaultValue={program.constraints.yearMin ?? ""} placeholder="From" /><input className={constraintInputClass} name="yearMax" type="number" defaultValue={program.constraints.yearMax ?? ""} placeholder="To" /></div></label>
            <label className={constraintLabelClass}>Languages<input className={constraintInputClass} name="languages" defaultValue={program.constraints.languages.join(", ")} placeholder="en, ko, fr" /></label>
            <label className={constraintLabelClass}>Genres<input className={constraintInputClass} name="genres" defaultValue={program.constraints.genres.join(", ")} placeholder="Horror, Thriller" /></label>
            <label className={constraintLabelClass}>Streaming services<input className={constraintInputClass} name="providers" defaultValue={program.constraints.providers.join(", ")} placeholder="Netflix, MUBI" /></label>
            <label className={constraintLabelClass}>Region<input className={constraintInputClass} name="region" maxLength={2} defaultValue={program.constraints.region} /></label>
            <label className={`${constraintLabelClass} col-span-2`}>Notes<input className={constraintInputClass} name="notes" defaultValue={program.constraints.notes} placeholder="No torture; okay with subtitles…" /></label>
            <button className={`${primaryButtonClass} self-end`} disabled={busy}>Save preferences</button>
          </form>
        </section>
      )}

      {panel === "history" && (
        <section className="mx-5 mb-10 grid max-w-275 grid-cols-1 gap-6 border-y border-line bg-[#0d0d0c] px-7.5 py-10 lg:mx-auto lg:grid-cols-[300px_1fr] lg:gap-20">
          <div><span className={eyebrowClass}>Shared history</span><h2 className="my-2 font-serif text-[34px] font-normal">Every change, remembered.</h2></div>
          <ol className="max-h-85 overflow-auto">{program.activity.map((entry) => <li className="grid grid-cols-[55px_1fr] gap-4 border-b border-[#201f1e] py-3 text-xs sm:grid-cols-[65px_1fr_140px]" key={entry.id}><span className={`text-[9px] font-bold tracking-[.1em] uppercase ${entry.actor === "agent" ? "text-[#e8847d]" : "text-[#aaa]"}`}>{entry.actor}</span><p className="text-[#ccc5bf]">{entry.detail}</p><time className="hidden text-right text-faint sm:block">{new Date(entry.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></li>)}</ol>
        </section>
      )}

      <section className="mx-auto max-w-275 px-4 pb-20 sm:px-7.5 sm:pb-30" aria-label="Ordered movie lineup">
        <div className="flex justify-between border-b border-line pb-3 text-[10px] tracking-[.13em] text-[#69645f] uppercase"><span>Sequence</span><span>Drag to reorder</span></div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
          <SortableContext items={program.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {program.items.map((item, index) => (
              <SortableMovie key={item.id} item={item} index={index} readOnly={readOnly} returnTo={`/program/${programId}`} onAction={action} onReplace={() => openSearch(item)} onRemove={() => openRemove(item)} onVeto={() => openVeto(item)} onTrailer={() => { setTrailer(item); trailerDialog.current?.showModal(); }} />
            ))}
          </SortableContext>
        </DndContext>
        {Array.from({ length: emptySlots }).map((_, index) => (
          <button key={index} className="grid min-h-29.5 w-full cursor-pointer grid-cols-[48px_42px_1fr] items-center border-0 border-b border-line bg-[#0c0c0b] text-left text-[#68635f] hover:bg-[#11100f] hover:text-[#bcb5af] disabled:cursor-default md:grid-cols-[82px_50px_1fr]" onClick={() => !readOnly && openSearch()} disabled={readOnly}>
            <span className="grid h-full place-items-center border-r border-line font-serif text-xl">{String(program.items.length + index + 1).padStart(2, "0")}</span>
            <Plus className="ml-5.5" />
            <strong className="ml-2.5 text-[13px] text-[#aaa39e]">{readOnly ? "Empty pick" : "Add a title"}</strong>
            {!readOnly && <small className="col-start-3 -mt-8.5 ml-2.5 text-[10px]">or ask your connected agent to fill it</small>}
          </button>
        ))}
      </section>

      {program.vetoes.length > 0 && <section className="mx-4 -mt-5 mb-17.5 max-w-260 border-t border-[#492522] py-10 sm:mx-auto sm:-mt-10 sm:mb-25"><span className={eyebrowClass}>Taste remembered</span><h2 className="my-2 mb-6 font-serif text-[38px] font-normal">Not for me</h2><div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">{program.vetoes.map((veto) => <article className="relative bg-[#100d0c] p-4.5 pr-12" key={`${veto.mediaType}:${veto.tmdbId}:${veto.seasonNumber ?? "all"}`}><del className="text-[13px] text-[#a75c57]">{veto.title}</del>{veto.reason && <p className="mt-2 font-serif text-base text-[#817b76]">“{veto.reason}”</p>}{!readOnly && <button className="absolute top-3 right-3 grid size-8 cursor-pointer place-items-center border border-white/10 text-[#9b7773] hover:border-pulse hover:text-[#ff8f89]" onClick={() => { setForgetVeto(veto); forgetDialog.current?.showModal(); }} aria-label={`Remove ${veto.title} from Not for me`} title="Forget this veto"><Trash2 size={14} /></button>}</article>)}</div></section>}

      <footer className="mx-6 flex items-center justify-between gap-7 border-t border-line py-7 text-[11px] text-faint sm:mx-[5vw] sm:pb-9.5">
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p><span>Lineup version {program.version}</span>
      </footer>

      <dialog ref={searchDialog} className={modalClass} onMouseDown={closeOnBackdrop} onClose={() => setReplaceItem(null)}>
        <button className={modalCloseClass} onClick={() => searchDialog.current?.close()} aria-label="Close"><X /></button>
        <span className={eyebrowClass}>{replaceItem ? `Replace ${replaceItem.title}` : "Add to lineup"}</span>
        <h2 className="my-2 mb-6 font-serif text-[clamp(38px,6vw,64px)] font-normal tracking-[-.04em]">Find the perfect pick.</h2>
        <div className="grid grid-cols-[35px_1fr_auto] items-center border-b border-[#514a46]"><Search /><input ref={searchInput} className="border-0 bg-transparent py-4 text-lg text-white outline-none" aria-label="Search movies and series" autoFocus value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); if (event.target.value.trim().length < 4) { setSearchResults([]); setSearching(false); } }} placeholder="Search by title…" /><span aria-live="polite" className="text-xs text-muted">{searching ? "Searching…" : searchQuery.trim().length < 4 ? "Type 4 characters" : ""}</span></div>
        <div className="mt-7.5 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5">
          {searchResults.map((media) => <button className="group cursor-pointer overflow-hidden border-0 bg-transparent p-0 text-left" key={`${media.mediaType}:${media.tmdbId}`} onClick={() => chooseMedia(media)}>
            <div className="relative aspect-2/3 overflow-hidden bg-[#222]">{media.posterPath ? <Image className="object-cover transition-transform group-hover:scale-105" src={`https://image.tmdb.org/t/p/w342${media.posterPath}`} alt="" fill sizes="180px" /> : <span>No poster</span>}</div>
            <strong className="mt-2 block overflow-hidden text-xs text-ellipsis whitespace-nowrap">{media.title}</strong><small className="text-[10px] text-muted">{media.year ?? "—"} · {media.mediaType === "tv" ? "Series" : "Movie"}{media.voteAverage !== null ? ` · ${media.voteAverage.toFixed(1)} TMDB` : ""}</small>
          </button>)}
        </div>
      </dialog>

      <dialog ref={deleteDialog} className={`${modalClass} w-[min(520px,calc(100vw-32px))]`} onMouseDown={closeOnBackdrop}>
        <button className={modalCloseClass} onClick={() => deleteDialog.current?.close()} aria-label="Close"><X /></button>
        <span className={eyebrowClass}>Delete lineup</span>
        <h2 className="my-2 mb-4 font-serif text-[clamp(38px,6vw,58px)] font-normal tracking-[-.04em]">Delete {program.title}?</h2>
        <p className="leading-relaxed text-muted">This permanently deletes the lineup, its picks, preferences, and history. Your watchlist and watch progress stay intact.</p>
        <div className="mt-7 flex justify-end gap-2"><button className="min-h-10 cursor-pointer border border-line px-5 text-sm hover:border-white/50" onClick={() => deleteDialog.current?.close()} disabled={busy}>Cancel</button><button className={primaryButtonClass} onClick={confirmDelete} disabled={busy}>{busy ? "Deleting…" : "Delete lineup"}</button></div>
      </dialog>

      <dialog ref={removeDialog} className={`${modalClass} w-[min(520px,calc(100vw-32px))]`} onMouseDown={closeOnBackdrop} onClose={() => setRemoveItem(null)}>
        <button className={modalCloseClass} onClick={() => removeDialog.current?.close()} aria-label="Close"><X /></button>
        <span className={eyebrowClass}>Confirm removal</span>
        <h2 className="my-2 mb-4 font-serif text-[clamp(38px,6vw,58px)] font-normal tracking-[-.04em]">Remove {removeItem?.title}?</h2>
        <p className="leading-relaxed text-muted">This removes the pick from your lineup. You can add it again later.</p>
        <div className="mt-7 flex justify-end gap-2"><button className="min-h-10 cursor-pointer border border-line px-5 text-sm hover:border-white/50" onClick={() => removeDialog.current?.close()}>Cancel</button><button className={primaryButtonClass} onClick={confirmRemove}>Remove</button></div>
      </dialog>

      <dialog ref={forgetDialog} className={`${modalClass} w-[min(520px,calc(100vw-32px))]`} onMouseDown={closeOnBackdrop} onClose={() => setForgetVeto(null)}>
        <button className={modalCloseClass} onClick={() => forgetDialog.current?.close()} aria-label="Close"><X /></button>
        <span className={eyebrowClass}>Forget preference</span>
        <h2 className="my-2 mb-4 font-serif text-[clamp(38px,6vw,58px)] font-normal tracking-[-.04em]">Remove {forgetVeto?.title}?</h2>
        <p className="leading-relaxed text-muted">This removes the title from Not for me, so it can be added or recommended for this lineup again.</p>
        <div className="mt-7 flex justify-end gap-2"><button className="min-h-10 cursor-pointer border border-line px-5 text-sm hover:border-white/50" onClick={() => forgetDialog.current?.close()}>Cancel</button><button className={primaryButtonClass} onClick={confirmForgetVeto}>Remove</button></div>
      </dialog>

      <dialog ref={vetoDialog} className={`${modalClass} w-[min(590px,calc(100vw-32px))]`} onMouseDown={closeOnBackdrop}>
        <button className={modalCloseClass} onClick={() => vetoDialog.current?.close()} aria-label="Close"><X /></button>
        <span className={eyebrowClass}>Teach your lineup your taste</span>
        <h2 className="my-2 mb-6 font-serif text-[clamp(38px,6vw,64px)] font-normal tracking-[-.04em]">Not for me: {vetoItem?.title}</h2>
        <p className="leading-relaxed text-muted">The title leaves the lineup. Add a reason if you want connected agents to remember why.</p>
        <form onSubmit={submitVeto}><textarea className="my-4 min-h-30 w-full resize-y border border-[#403b37] bg-[#0a0a09] p-4 text-white outline-none focus:border-pulse" name="reason" autoFocus maxLength={500} placeholder="Why doesn't this belong? (optional)" /><button className={`${primaryButtonClass} w-full`}>Remove from lineup</button></form>
      </dialog>

      <dialog ref={trailerDialog} className="m-auto w-[min(1100px,calc(100vw-24px))] overflow-visible border border-[#35312e] bg-black p-0 text-ink shadow-[0_40px_140px_#000] outline-none" onMouseDown={closeOnBackdrop} onClose={() => setTrailer(null)}>
        <button className={`${modalCloseClass} z-2 bg-black`} onClick={() => trailerDialog.current?.close()} aria-label="Close"><X /></button>
        {trailer?.trailerKey && <iframe className="block aspect-video w-full border-0" src={`https://www.youtube-nocookie.com/embed/${trailer.trailerKey}?autoplay=1`} title={`${trailer.title} trailer`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />}
      </dialog>
    </main>
  );
}
