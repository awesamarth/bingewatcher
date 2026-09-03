import { describe, expect, test } from "bun:test";
import { discoverQuerySchema } from "@/lib/discovery";

describe("media discovery filters", () => {
  test("rejects inverted ranges and genre names without a media type", () => {
    expect(discoverQuerySchema.safeParse({ yearMin: "2000", yearMax: "1990" }).success).toBe(false);
    expect(discoverQuerySchema.safeParse({ runtimeMin: "180", runtimeMax: "90" }).success).toBe(false);
    expect(discoverQuerySchema.safeParse({ genreNames: "Horror" }).success).toBe(false);
    expect(discoverQuerySchema.safeParse({ type: "movie", genreNames: "Horror" }).success).toBe(true);
  });
});
