"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

const control = "h-10 border border-[#3a3531] bg-[#11100f] px-3 text-xs text-[#d8d2cc] outline-none transition hover:border-[#68605a] focus:border-pulse focus:ring-1 focus:ring-pulse/30";

export function FilterMenu({ label, count = 0, children, align = "left", className = "" }: { label: string; count?: number; children: ReactNode; align?: "left" | "right"; className?: string }) {
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!details.current?.contains(event.target as Node)) details.current?.removeAttribute("open"); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && details.current?.open) { details.current.open = false; details.current.querySelector("summary")?.focus(); } };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  return (
    <details ref={details} className={`group relative ${className}`}>
      <summary className={`${control} flex w-full cursor-pointer list-none items-center justify-between gap-2 whitespace-nowrap [&::-webkit-details-marker]:hidden`}>
        <span>{label}</span>{count > 0 && <span className="grid size-5 place-items-center rounded-full bg-pulse text-[9px] font-bold text-white">{count}</span>}<ChevronDown className="ml-1 text-[#77716c] transition group-open:rotate-180" size={14} />
      </summary>
      <div className={`absolute z-30 mt-2 w-72 border max-sm:fixed max-sm:inset-x-5 max-sm:top-1/2 max-sm:mt-0 max-sm:w-auto max-sm:-translate-y-1/2 border-[#3a3531] bg-[#11100f]/98 p-3 shadow-[0_24px_70px_rgba(0,0,0,.65)] backdrop-blur-xl ${align === "right" ? "right-0" : "left-0"}`}>{children}</div>
    </details>
  );
}

export function SelectMenu({ value, options, onChange, ariaLabel, placeholder = "Select", className = "" }: { value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void; ariaLabel: string; placeholder?: string; className?: string }) {
  const selected = options.find((option) => option.value === value)?.label ?? placeholder;
  return <FilterMenu label={selected} className={className}><div className="-m-1 max-h-[min(24rem,70vh)] overflow-y-auto p-1" role="listbox" aria-label={ariaLabel}>{options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} className={`flex w-full cursor-pointer items-center justify-between px-1.5 py-2 text-left text-[13px] hover:bg-white/5 hover:text-white ${option.value === value ? "text-white" : "text-[#c7c1bb]"}`} onClick={(event) => { onChange(option.value); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{option.label}<Check className={option.value === value ? "text-pulse" : "invisible"} size={14} /></button>)}</div></FilterMenu>;
}

export const dropdownInputClass = "h-10 min-w-0 border border-[#3a3531] bg-[#090908] px-3 text-xs text-white outline-none placeholder:text-[#625c57] focus:border-pulse";
