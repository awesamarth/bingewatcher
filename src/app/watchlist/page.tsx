import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { WatchlistClient } from "@/components/watchlist-client";
import { WebMCPTools } from "@/components/webmcp-tools";

export const metadata: Metadata = { title: "Your watchlist" };

export default function WatchlistPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_75%_0%,rgba(227,38,31,.09),transparent_28%)]">
      <WebMCPTools />
      <SiteNav active="watchlist" />
      <WatchlistClient />
    </main>
  );
}
