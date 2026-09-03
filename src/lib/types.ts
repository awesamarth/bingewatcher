export type Constraints = {
  runtimeMax: number | null;
  languages: string[];
  genres: string[];
  providers: string[];
  yearMin: number | null;
  yearMax: number | null;
  region: string;
  notes: string;
};

export type MediaType = "movie" | "tv";

export type DiscoverFilters = {
  mediaType?: MediaType;
  genreIds?: number[];
  providerIds?: number[];
  originalLanguage?: string;
  yearMin?: number;
  yearMax?: number;
  runtimeMin?: number;
  runtimeMax?: number;
  region?: string;
  sort?: "popularity.desc" | "vote_average.desc" | "date.desc";
  page?: number;
};

export type SeasonSummary = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  year: number | null;
  posterPath: string | null;
};

export type Episode = {
  episodeNumber: number;
  name: string;
  overview: string;
  runtime: number | null;
  airDate: string | null;
  stillPath: string | null;
};

export type Media = {
  mediaType: MediaType;
  tmdbId: number;
  seasonNumber: number | null;
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  runtime: number | null;
  genres: string[];
  originalLanguage: string;
  voteAverage: number | null;
  voteCount: number;
  providers: string[];
  trailerKey: string | null;
  episodeCount: number | null;
  seasonCount: number | null;
  seasons?: SeasonSummary[];
  episodes?: Episode[];
};

// Kept as aliases while existing lineup internals still use movie-oriented names.
export type Movie = Media;

export type ProgramItem = Media & {
  id: string;
  position: number;
  locked: boolean;
  watched: boolean;
  reaction: string | null;
  explanation: string;
  addedBy: "human" | "agent";
};

export type Veto = {
  mediaType: MediaType;
  tmdbId: number;
  seasonNumber: number | null;
  title: string;
  reason: string;
  createdAt: string;
};

export type Activity = {
  id: string;
  actor: "human" | "agent";
  action: string;
  detail: string;
  createdAt: string;
};

export type Program = {
  id: string;
  title: string;
  prompt: string;
  targetSize: number;
  constraints: Constraints;
  version: number;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
  items: ProgramItem[];
  vetoes: Veto[];
  activity: Activity[];
};

export type MediaSearchResult = Pick<
  Media,
  | "mediaType"
  | "tmdbId"
  | "seasonNumber"
  | "title"
  | "year"
  | "posterPath"
  | "backdropPath"
  | "overview"
  | "originalLanguage"
  | "voteAverage"
  | "voteCount"
>;

export type MovieSearchResult = MediaSearchResult;

export type WatchlistItem = Media & { addedAt: string };

export type WatchProgress = {
  mediaType: MediaType;
  tmdbId: number;
  seasonNumber: number | null;
  watchedEpisodes: number[];
  watched: boolean;
  reaction: string | null;
  updatedAt: string | null;
};

export const defaultConstraints: Constraints = {
  runtimeMax: null,
  languages: [],
  genres: [],
  providers: [],
  yearMin: null,
  yearMax: null,
  region: "US",
  notes: "",
};
