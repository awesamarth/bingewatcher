import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { TitleActions } from "@/components/title-actions";
import { TitleBackLink } from "@/components/title-back-link";
import { WebMCPTools } from "@/components/webmcp-tools";
import { titleReturn } from "@/lib/navigation";
import { getStreamingOffers } from "@/lib/streaming";
import { getMedia, getRecommendations } from "@/lib/tmdb";
import type { MediaType } from "@/lib/types";

function offerAction(type: string) {
  if (type === "rent") return "Rent";
  if (type === "buy") return "Buy";
  return "Watch";
}

export default async function TitlePage({ params, searchParams }: { params: Promise<{ type: string; id: string }>; searchParams: Promise<{ season?: string; from?: string }> }) {
  const { type, id } = await params;
  const { season, from } = await searchParams;
  const destination = titleReturn(from);
  if ((type !== "movie" && type !== "tv") || !Number.isInteger(Number(id)) || Number(id) <= 0) return <main className="grid min-h-screen place-items-center">Title not found.</main>;
  const seasonNumber = season === undefined ? null : Number(season);
  const mediaType = type as MediaType;
  const tmdbId = Number(id);
  const [media, recommendations, offers] = await Promise.all([
    getMedia(mediaType, tmdbId, "IN", Number.isInteger(seasonNumber) && Number(seasonNumber) >= 0 ? seasonNumber : null),
    getRecommendations(mediaType, tmdbId).catch(() => []),
    getStreamingOffers(mediaType, tmdbId, "IN").catch((error) => { console.error(error); return []; }),
  ]);

  return (
    <main className="min-h-screen bg-canvas">
      <WebMCPTools surface="explore" />
      <SiteNav active="explore" />
      <header className="relative flex min-h-[78svh] items-end overflow-x-clip px-5 pb-14 sm:px-[8vw] sm:pb-20">
        {media.backdropPath && <Image className="object-cover" src={`https://image.tmdb.org/t/p/w1280${media.backdropPath}`} alt="" fill priority sizes="100vw" />}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#070707_5%,rgba(7,7,7,.9)_40%,rgba(7,7,7,.2)),linear-gradient(0deg,#070707_2%,transparent_50%,rgba(0,0,0,.45))]" />
        <div className="relative z-2 max-w-210">
          <TitleBackLink destination={destination} />
          <p className="mb-3 text-[10px] font-bold tracking-[.16em] text-pulse uppercase">{media.seasonNumber !== null ? `Season ${media.seasonNumber}` : media.mediaType === "tv" ? "Series" : "Movie"}</p>
          <h1 className="font-serif text-[clamp(54px,9vw,126px)] leading-[.82] tracking-[-.065em]">{media.title}</h1>
          <p className="mt-5 flex flex-wrap items-center text-xs text-[#d0c9c3] [&>span+span]:before:mx-2 [&>span+span]:before:text-[#514c47] [&>span+span]:before:content-['|']">
            {media.year && <span>{media.year}</span>}
            {media.voteAverage !== null && <span>{media.voteAverage.toFixed(1)} TMDB</span>}
            {media.episodeCount && <span>{media.episodeCount} episodes</span>}
            {media.runtime && <span>{media.runtime} min</span>}
            {media.genres.length > 0 && <span>{media.genres.join(" · ")}</span>}
          </p>
          <p className="mt-6 max-w-165 text-sm leading-7 text-[#d0c9c3] sm:text-base">{media.overview}</p>
          {offers.length > 0 ? <div className="mt-6">
            <p className="mb-2 text-[10px] font-bold tracking-[.14em] text-[#aaa39d] uppercase">Watch now in India</p>
            <div className="flex flex-wrap gap-2">{offers.map((offer) => <a className="group inline-flex min-h-14 items-center gap-3 border border-white/15 bg-black/45 px-4 py-2.5 transition hover:border-white/40 hover:bg-black/65" href={offer.link} key={offer.serviceId} target="_blank" rel="noopener noreferrer">
              {offer.logoUrl && <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="h-5 w-18 object-contain object-left" src={offer.logoUrl} alt="" />
              </>}
              <span><strong className="block text-xs font-semibold">{offerAction(offer.type)} on {offer.serviceName}</strong><small className="mt-0.5 block text-[9px] tracking-wide text-[#8c857f] uppercase">{[offer.type === "subscription" ? "Subscription" : offer.type === "free" ? "Free" : offer.price, offer.quality?.toUpperCase()].filter(Boolean).join(" · ")}</small></span>
              <ArrowUpRight className="ml-1 text-faint transition group-hover:text-white" size={15} />
            </a>)}</div>
          </div> : media.providers.length > 0 && <p className="mt-4 text-xs text-[#8c857f]">Available via {media.providers.slice(0, 5).join(", ")}</p>}
          {media.trailerKey && <a className="mt-6 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-xs font-semibold hover:border-pulse" href={`https://www.youtube.com/watch?v=${media.trailerKey}`} target="_blank" rel="noreferrer"><Play size={15} /> Watch trailer</a>}
          <TitleActions media={media} />
        </div>
      </header>

      {media.mediaType === "tv" && media.seasonNumber === null && media.seasons && media.seasons.length > 0 && <section className="px-5 py-16 sm:px-[8vw]">
        <p className="text-[10px] font-bold tracking-[.15em] text-pulse uppercase">Choose your commitment</p><h2 className="mt-2 mb-7 font-serif text-5xl">Seasons</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{media.seasons.map((item) => <Link className="group" key={item.seasonNumber} href={`/title/tv/${media.tmdbId}?season=${item.seasonNumber}&from=${encodeURIComponent(destination.href)}`}><div className="relative aspect-[2/3] overflow-hidden bg-[#191817]">{item.posterPath && <Image className="object-cover transition group-hover:scale-[1.025]" src={`https://image.tmdb.org/t/p/w500${item.posterPath}`} alt="" fill sizes="200px" />}</div><strong className="mt-3 block text-sm">{item.name}</strong><small className="text-muted">{item.episodeCount} episodes{item.year ? ` · ${item.year}` : ""}</small></Link>)}</div>
      </section>}

      {recommendations.length > 0 && <section className="border-t border-line px-5 py-16 sm:px-[8vw]"><p className="text-[10px] font-bold tracking-[.15em] text-pulse uppercase">TMDB recommendations</p><h2 className="mt-2 mb-7 font-serif text-5xl">More like this</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{recommendations.slice(0, 7).map((item) => <Link className="group" key={`${item.mediaType}:${item.tmdbId}`} href={`/title/${item.mediaType}/${item.tmdbId}?from=${encodeURIComponent(destination.href)}`}><div className="relative aspect-[2/3] overflow-hidden bg-[#191817]">{item.posterPath && <Image className="object-cover transition group-hover:scale-[1.025]" src={`https://image.tmdb.org/t/p/w500${item.posterPath}`} alt="" fill sizes="200px" />}</div><strong className="mt-3 line-clamp-1 block text-sm">{item.title}</strong><small className="text-muted">{item.year}{item.voteAverage !== null ? ` · ${item.voteAverage.toFixed(1)} TMDB` : ""}</small></Link>)}</div></section>}
    </main>
  );
}
