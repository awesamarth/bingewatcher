import { describe, expect, test } from "bun:test";
import { defaultConstraints, type Program } from "./types";
import { validateProgram } from "./validation";

const program: Program = {
  id: "program",
  title: "A tense night",
  prompt: "Three short thrillers",
  targetSize: 1,
  constraints: { ...defaultConstraints, runtimeMax: 120, genres: ["Thriller"], yearMin: 2000 },
  version: 1,
  shareToken: "share",
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-30T00:00:00.000Z",
  vetoes: [],
  activity: [],
  items: [{
    id: "item",
    mediaType: "movie",
    tmdbId: 1,
    seasonNumber: null,
    title: "Right Movie",
    year: 2020,
    posterPath: null,
    backdropPath: null,
    overview: "",
    runtime: 110,
    genres: ["Thriller"],
    originalLanguage: "en",
    voteAverage: 7.8,
    voteCount: 12000,
    providers: [],
    trailerKey: null,
    episodeCount: null,
    seasonCount: null,
    position: 0,
    locked: false,
    watched: false,
    reaction: null,
    explanation: "",
    addedBy: "agent",
  }],
};

describe("validateProgram", () => {
  test("accepts a complete program that meets its constraints", () => {
    expect(validateProgram(program)).toEqual({ valid: true, issues: [] });
  });

  test("reports empty slots and selection violations", () => {
    const invalid = {
      ...program,
      targetSize: 2,
      items: [{ ...program.items[0], title: "Wrong Movie", runtime: 140, genres: ["Comedy"], year: 1990 }],
    };
    const result = validateProgram(invalid);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      "1 pick(s) missing.",
      "Wrong Movie exceeds 120 minutes.",
      "Wrong Movie does not match your genre preference.",
      "Wrong Movie was released before 2000.",
    ]);
  });
});
