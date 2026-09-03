import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CreateProgramForm } from "@/components/create-program-form";
import { SiteNav } from "@/components/site-nav";
import { WebMCPTools } from "@/components/webmcp-tools";

export const metadata: Metadata = { title: "New lineup" };

export default function NewLineupPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <WebMCPTools />
      <SiteNav active="lineups" />
      <section className="mx-auto grid max-w-360 grid-cols-1 gap-14 px-6 pt-36 pb-20 sm:px-8 sm:pt-44 sm:pb-37.5 lg:grid-cols-[.8fr_1.2fr] lg:gap-[8vw]">
        <div>
          <Link href="/lineups" className="mb-8 inline-flex items-center gap-2 text-xs text-muted sm:mb-12"><ArrowLeft size={16} /> All lineups</Link>
          <span className="block w-10.5 border-t-2 border-pulse pt-2 text-xs font-bold text-pulse">New</span>
          <h1 className="my-8 font-serif text-6xl leading-[.9] font-normal tracking-[-.05em] sm:text-[clamp(52px,6vw,92px)]">A watchlist<br />worth watching.</h1>
          <p className="max-w-107.5 text-base leading-[1.7] text-muted">A lineup has an order, an arc, and a reason for every pick. Build it yourself or let an external WebMCP agent work on it with you.</p>
        </div>
        <CreateProgramForm />
      </section>
    </main>
  );
}
