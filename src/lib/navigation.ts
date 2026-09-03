export type TitleReturn = { href: string; label: "Explore" | "Watchlist" | "Lineup" };

export function titleReturn(value: unknown): TitleReturn {
  if (typeof value !== "string" || value.length > 2000 || !value.startsWith("/")) return { href: "/explore", label: "Explore" };
  const url = new URL(value, "https://bingewatcher.local");
  if (url.origin !== "https://bingewatcher.local") return { href: "/explore", label: "Explore" };
  if (url.pathname === "/explore") return { href: `${url.pathname}${url.search}`, label: "Explore" };
  if (url.pathname === "/watchlist") return { href: "/watchlist", label: "Watchlist" };
  if (/^\/program\/[0-9a-f-]{36}$/i.test(url.pathname)) return { href: url.pathname, label: "Lineup" };
  return { href: "/explore", label: "Explore" };
}
