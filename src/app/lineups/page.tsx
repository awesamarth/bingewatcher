import type { Metadata } from "next";
import { RecentPrograms } from "@/components/recent-programs";
import { SiteNav } from "@/components/site-nav";
import { WebMCPTools } from "@/components/webmcp-tools";

export const metadata: Metadata = { title: "Your lineups" };

export default function LineupsPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <WebMCPTools />
      <SiteNav active="lineups" />
      <RecentPrograms standalone />
    </main>
  );
}
