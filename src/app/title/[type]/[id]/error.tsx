"use client";

import Link from "next/link";

export default function TitleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
      <div>
        <p className="text-[10px] font-bold tracking-[.16em] text-pulse uppercase">TMDB didn’t answer</p>
        <h1 className="mt-3 font-serif text-6xl">That title took too long.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted">This is usually temporary. Try loading it once more.</p>
        <div className="mt-7 flex justify-center gap-3"><button className="cursor-pointer bg-pulse px-5 py-3 text-xs font-semibold" onClick={reset}>Try again</button><Link className="border border-line px-5 py-3 text-xs font-semibold" href="/explore">Back to Explore</Link></div>
      </div>
    </main>
  );
}
