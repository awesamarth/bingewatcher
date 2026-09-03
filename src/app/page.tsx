import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowDown, LockKeyhole, MousePointer2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { CreateProgramForm } from "@/components/create-program-form";
import { RecentPrograms } from "@/components/recent-programs";
import { SiteNav } from "@/components/site-nav";
import { WebMCPTools } from "@/components/webmcp-tools";
import { trendingMovies } from "@/lib/tmdb";

const posterPositions = [
  "left-0 -top-[3%]",
  "left-[27%] top-[4%]",
  "left-[54%] -top-[8%]",
  "left-[81%] top-[1%]",
  "left-0 top-[49%]",
  "left-[27%] top-[56%]",
  "left-[54%] top-[45%]",
];

export default async function Home() {
  await connection();
  const movies = await trendingMovies().catch((error) => { console.error("Could not load homepage posters", error); return []; });

  return (
    <main className="min-h-screen overflow-hidden bg-canvas">
      <WebMCPTools />
      <SiteNav overlay />

      <section className="relative flex h-svh min-h-180 items-end px-6 pb-[9vh] sm:px-[8vw] lg:min-h-195">
        <div className="absolute inset-y-0 -right-[40%] left-[20%] origin-bottom -skew-x-5 overflow-hidden opacity-60 sm:right-0 sm:bottom-0 sm:left-[42%] sm:opacity-100" aria-hidden="true">
          {movies.slice(0, 7).map((movie, index) => movie.posterPath && (
            <div className={`absolute h-[48%] w-1/4 overflow-hidden bg-[#191817] contrast-110 saturate-70 ${posterPositions[index]}`} key={movie.tmdbId}>
              <Image className="object-cover" src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`} alt="" fill sizes="20vw" priority={index < 3} />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#070707_10%,rgba(7,7,7,.78)_55%,rgba(7,7,7,.3))] sm:bg-[linear-gradient(90deg,#070707_8%,rgba(7,7,7,.95)_31%,rgba(7,7,7,.58)_57%,rgba(7,7,7,.12)),linear-gradient(0deg,#070707_0%,transparent_32%)]" />
        <div className="relative z-2 max-w-190">
          <p className="mb-5 text-xs font-semibold tracking-[.16em] text-[#d4cec7] uppercase">Movie nights, curated by you</p>
          <h1 className="m-0 -ml-[.1em] max-w-225 text-[clamp(60px,19vw,92px)] leading-[.79] font-medium tracking-[-.085em] sm:text-[clamp(70px,8.5vw,138px)]">Build the night,<br /><em className="font-serif text-[1.08em] font-normal tracking-[-.045em] text-pulse">together.</em></h1>
          <p className="my-7 max-w-146 text-[15px] leading-[1.55] text-[#b9b3ad] sm:mt-9.5 sm:text-[clamp(16px,1.45vw,20px)]">Slack off this weekend. Make every movie night feel unmistakably yours.</p>
          <div className="flex flex-wrap gap-6"><Link href="/explore" className="inline-flex items-center gap-2 border-b border-pulse pb-2 text-sm font-semibold text-[#ff9b94]">Explore films & shows</Link><Link href="#create" className="inline-flex items-center gap-2 border-b border-[#6d6863] pb-2 text-sm font-semibold">Build your lineup <ArrowDown size={17} /></Link></div>
        </div>
      </section>

      <section className="mx-auto grid max-w-360 grid-cols-1 gap-14 px-6 py-20 sm:px-[8vw] sm:py-37.5 lg:grid-cols-[.8fr_1.2fr] lg:gap-[8vw]" id="create">
        <div>
          <span className="block w-10.5 border-t-2 border-pulse pt-2 text-xs font-bold text-pulse">01</span>
          <h2 className="my-8 font-serif text-6xl leading-[.9] font-normal tracking-[-.05em] sm:text-[clamp(52px,6vw,92px)]">A watchlist<br />worth watching.</h2>
          <p className="max-w-107.5 text-base leading-[1.7] text-muted">A lineup has an order, an arc, and a reason for every pick. Build it yourself or let an external WebMCP agent work on it with you.</p>
          <div className="mt-11 flex flex-wrap gap-6 text-[13px] text-[#c7c1bb]">
            <span className="flex items-center gap-2"><MousePointer2 size={16} /> You arrange</span>
            <span className="flex items-center gap-2"><LockKeyhole size={16} /> You stay in control</span>
          </div>
        </div>
        <CreateProgramForm />
      </section>

      <RecentPrograms />

      <footer className="mx-6 flex items-start justify-between gap-8 border-t border-line py-7 text-[11px] text-faint sm:mx-[5vw] sm:items-center sm:pb-9.5">
        <Brand compact />
        <p className="max-w-55 text-right sm:max-w-none">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </footer>
    </main>
  );
}
