"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";

type RecentProgram = {
  id: string;
  title: string;
  prompt: string;
  targetSize: number;
  itemCount: number;
  editToken: string;
  updatedAt: string;
};

function ProgramLinks({ programs }: { programs: RecentProgram[] }) {
  return (
    <div className="border-t border-[#49443f]">
      {programs.map((program) => (
        <Link className="group grid grid-cols-[48px_1fr_20px] items-center gap-4 border-b border-line px-1 py-5" key={program.id} href={`/program/${program.id}?edit=${program.editToken}`}>
          <span className="text-[11px] text-pulse">{program.itemCount}/{program.targetSize}</span>
          <div className="min-w-0"><strong className="font-serif text-[21px] font-normal">{program.title}</strong><p className="mt-1 overflow-hidden text-[11px] text-ellipsis whitespace-nowrap text-muted">{program.prompt}</p></div>
          <ArrowUpRight className="w-4 text-faint group-hover:text-pulse" />
        </Link>
      ))}
    </div>
  );
}

export function RecentPrograms({ standalone = false }: { standalone?: boolean }) {
  const [programs, setPrograms] = useState<RecentProgram[] | null>(null);

  useEffect(() => {
    fetch("/api/programs").then((response) => response.ok ? response.json() : { programs: [] }).then((data) => setPrograms(data.programs ?? []));
  }, []);

  if (!standalone && !programs?.length) return null;

  if (standalone) return (
    <section className="mx-auto max-w-298 px-6 pt-36 pb-24 sm:px-8 sm:pt-44">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div><p className="text-[10px] font-bold tracking-[.16em] text-pulse uppercase">Your library</p><h1 className="mt-3 font-serif text-[clamp(58px,8vw,104px)] leading-[.85] tracking-[-.06em]">Your lineups.</h1></div>
        <Link className="inline-flex min-h-12 items-center gap-3 bg-pulse px-5 font-semibold text-white hover:bg-[#f1322b]" href="/lineups/new">New lineup <ArrowRight size={17} /></Link>
      </div>
      {programs === null ? <p className="border-t border-line py-8 text-sm text-muted">Loading your lineups…</p> : programs.length ? <ProgramLinks programs={programs} /> : <div className="border-t border-line py-12"><h2 className="font-serif text-3xl">No lineups yet.</h2><p className="mt-3 text-sm text-muted">Build your first weekend binge and start adding picks.</p></div>}
    </section>
  );

  return (
    <section className="mx-auto grid max-w-298 grid-cols-1 gap-12 px-6 pt-5 pb-22.5 lg:grid-cols-[.8fr_1.2fr] lg:gap-[8vw] lg:pb-35">
      <div><span className="block w-10.5 border-t-2 border-pulse pt-2 text-xs font-bold text-pulse">02</span><h2 className="mt-6 font-serif text-5xl leading-[.95] font-normal tracking-[-.04em]">Pick up where<br />you left off.</h2></div>
      <ProgramLinks programs={programs ?? []} />
    </section>
  );
}
