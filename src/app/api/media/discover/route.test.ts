import { describe, expect, test } from "bun:test";
import { discoverQuerySchema, matchesSearchFilters } from "@/lib/discovery";

describe("media discovery filters", () => {
  test("rejects inverted ranges and genre names without a media type", () => {
    expect(discoverQuerySchema.safeParse({ yearMin: "2000", yearMax: "1990" }).success).toBe(false);
    expect(discoverQuerySchema.safeParse({ runtimeMin: "180", runtimeMax: "90" }).success).toBe(false);
    expect(discoverQuerySchema.safeParse({ genreNames: "Horror" }).success).toBe(false);
    expect(discoverQuerySchema.safeParse({ type: "movie", genreNames: "Horror" }).success).toBe(true);
  });

  test("combines text-search metadata filters with AND genres and OR providers", () => {
    const candidate = { mediaType: "movie" as const, genreIds: [27, 53], providerIds: [8, 119], originalLanguage: "en", year: 2024, runtime: 112 };
    expect(matchesSearchFilters(candidate, { mediaType: "movie", genreIds: [27, 53], providerIds: [337, 8], originalLanguage: "en", yearMin: 2020, runtimeMax: 120 })).toBe(true);
    expect(matchesSearchFilters(candidate, { genreIds: [27, 35] })).toBe(false);
    expect(matchesSearchFilters(candidate, { providerIds: [337], yearMax: 2023 })).toBe(false);
  });
});
