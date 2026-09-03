"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { TitleReturn } from "@/lib/navigation";

type NavigationEntry = { index: number; url: string };
type NavigationHistory = { currentEntry?: NavigationEntry; entries: () => NavigationEntry[] };

export function TitleBackLink({ destination }: { destination: TitleReturn }) {
  const router = useRouter();

  function goBack() {
    const navigation = (window as Window & { navigation?: NavigationHistory }).navigation;
    const current = navigation?.currentEntry;
    const previous = current && navigation?.entries().find((entry) => entry.index === current.index - 1);
    if (previous) {
      const previousUrl = new URL(previous.url);
      const destinationUrl = new URL(destination.href, window.location.origin);
      const sameDestination = previousUrl.origin === window.location.origin
        && previousUrl.pathname === destinationUrl.pathname
        && (destination.label === "Lineup" || previousUrl.search === destinationUrl.search);
      if (sameDestination) {
        router.back();
        return;
      }
    }
    router.push(destination.href);
  }

  return <button className="mb-8 inline-flex cursor-pointer items-center gap-2 text-xs text-[#c4bdb7] hover:text-white" onClick={goBack}><ArrowLeft size={15} /> {destination.label}</button>;
}
