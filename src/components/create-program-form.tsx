"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { SelectMenu } from "@/components/dropdown";

const fieldClass = "w-full border-0 border-b border-[#46413d] bg-transparent px-0 pt-3 pb-3.5 text-[19px] text-white outline-none transition-colors placeholder:text-[#58534f] focus:border-pulse";

export function CreateProgramForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [targetSize, setTargetSize] = useState(6);
  const [region, setRegion] = useState("IN");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, prompt, targetSize, region, actor: "human" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create lineup");
      router.push(`/program/${data.id}?edit=${data.editToken}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create lineup");
      setPending(false);
    }
  }

  return (
    <form className="self-start border-t border-[#4b4743] bg-surface p-7 shadow-[0_25px_80px_rgba(0,0,0,.35)] sm:p-10 lg:p-[58px]" onSubmit={submit}>
      <div className="mb-9 flex items-center justify-between gap-4">
        <span className="text-[11px] font-semibold tracking-[.16em] text-[#c8c2bc] uppercase">New lineup</span>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[10px] text-muted"><span>Region</span><SelectMenu value={region} onChange={setRegion} ariaLabel="Streaming region" options={["IN", "US", "GB", "CA", "AU", "DE", "FR", "JP", "KR"].map((value) => ({ value, label: value }))} /></label>
          <span className="inline-flex items-center gap-2 text-xs text-muted" aria-label={`${targetSize} picks`}>
            <button className="grid size-6.5 cursor-pointer place-items-center rounded-full border border-line bg-transparent" type="button" onClick={() => setTargetSize((value) => Math.max(1, value - 1))} aria-label="Remove a pick"><Minus size={15} /></button>
            <strong className="text-sm text-ink">{targetSize}</strong> picks
            <button className="grid size-6.5 cursor-pointer place-items-center rounded-full border border-line bg-transparent" type="button" onClick={() => setTargetSize((value) => Math.min(12, value + 1))} aria-label="Add a pick"><Plus size={15} /></button>
          </span>
        </div>
      </div>
      <label className="mb-6 grid gap-2.5 text-xs font-medium text-[#d1cbc5]">
        <span>Name your weekend binge</span>
        <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A descent into paranoia" maxLength={80} required />
      </label>
      <label className="mb-6 grid gap-2.5 text-xs font-medium text-[#d1cbc5]">
        <span>What should the lineup feel like?</span>
        <textarea className={`${fieldClass} min-h-31 resize-y leading-normal`} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Six psychological thrillers that begin grounded and become increasingly surreal. Nothing over two hours." maxLength={600} required />
      </label>
      {error && <p className="text-[13px] text-[#ff8a84]" role="alert">{error}</p>}
      <button className="mt-1 flex min-h-12.5 w-full cursor-pointer items-center justify-center gap-3 rounded-sm border-0 bg-pulse px-5.5 font-semibold text-white transition hover:-translate-y-px hover:bg-[#f1322b] disabled:cursor-wait disabled:opacity-55 disabled:hover:translate-y-0" disabled={pending}>
        {pending ? "Creating…" : "Build this lineup"}<ArrowRight size={18} />
      </button>
    </form>
  );
}
