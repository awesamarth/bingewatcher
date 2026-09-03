import Link from "next/link";

export function Brand({ compact = false, large = false }: { compact?: boolean; large?: boolean }) {
  return (
    <Link href="/" className={`inline-flex items-baseline leading-none font-semibold tracking-[-0.055em] text-ink ${large ? "text-[28px]" : "text-xl"}`} aria-label="BingeWatcher home">
      <span>Binge</span><i className={`font-serif font-normal tracking-[-0.035em] text-ink ${large ? "text-[36px]" : "text-[25px]"}`}>Watcher</i>{!compact && <b className={`ml-1.5 text-pulse ${large ? "text-[9px]" : "text-[7px]"}`} aria-hidden="true">●</b>}
    </Link>
  );
}
