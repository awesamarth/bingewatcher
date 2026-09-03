import { describe, expect, test } from "bun:test";
import { titleReturn } from "./navigation";

describe("titleReturn", () => {
  test("preserves safe product origins and rejects redirects", () => {
    expect(titleReturn("/explore?q=Alien&genres=27")).toEqual({ href: "/explore?q=Alien&genres=27", label: "Explore" });
    expect(titleReturn("/watchlist")).toEqual({ href: "/watchlist", label: "Watchlist" });
    expect(titleReturn("/program/171d7e9f-9ce7-4eae-b12e-af3d6ad0c784")).toEqual({ href: "/program/171d7e9f-9ce7-4eae-b12e-af3d6ad0c784", label: "Lineup" });
    expect(titleReturn("//example.com/phish")).toEqual({ href: "/explore", label: "Explore" });
  });
});
