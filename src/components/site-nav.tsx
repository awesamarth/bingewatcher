"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Brand } from "@/components/brand";

export function SiteNav({ active, overlay = false }: { active?: "explore" | "watchlist" | "lineups"; overlay?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 32);
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("scroll", update); };
  }, []);

  const surface = overlay && !scrolled ? "bg-gradient-to-b from-black/70 via-black/20 to-transparent" : "bg-[#070707]/20 backdrop-blur-xl";
  const textContrast = overlay && !scrolled ? "[text-shadow:0_1px_7px_#000,0_0_1px_#000]" : "";

  return (
    <nav className={`fixed top-0 left-0 z-40 flex w-full items-center justify-between px-5 py-5.5 transition-[background-color,backdrop-filter] duration-300 sm:px-[8vw] ${surface}`}>
      <Brand large />
      <div className={`flex items-center gap-2 text-[13px] font-semibold text-white/90 transition-[text-shadow] duration-300 sm:gap-5 sm:text-sm ${textContrast}`}>
        <Link className={active === "explore" ? "text-white" : "hover:text-white"} href="/explore">Explore</Link>
        <Link className={active === "watchlist" ? "text-white" : "hover:text-white"} href="/watchlist">Watchlist</Link>
        <Link className={active === "lineups" ? "text-white" : "hover:text-white"} href="/lineups">My lineups</Link>
        <Link className="hidden min-h-9 items-center gap-1.5 border border-white/10 bg-black/45 px-3 text-[#f36b64] shadow-[inset_0_1px_rgba(255,255,255,.06)] transition-[background-color,border-color] [text-shadow:none] hover:border-pulse/50 hover:bg-black/60 sm:inline-flex" href={overlay ? "/#create" : "/lineups/new"}><Plus className="text-white" size={15} /> New lineup</Link>
      </div>
    </nav>
  );
}
