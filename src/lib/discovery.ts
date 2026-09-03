import { z } from "zod";

export const discoverQuerySchema = z.object({
  type: z.enum(["movie", "tv"]).optional(),
  genres: z.string().regex(/^\d+(,\d+)*$/).optional(),
  genreNames: z.string().trim().min(2).max(300).optional(),
  providers: z.string().regex(/^\d+(,\d+)*$/).optional(),
  language: z.string().regex(/^[a-z]{2}$/i).optional(),
  yearMin: z.coerce.number().int().min(1870).max(2100).optional(),
  yearMax: z.coerce.number().int().min(1870).max(2100).optional(),
  runtimeMin: z.coerce.number().int().min(1).max(1000).optional(),
  runtimeMax: z.coerce.number().int().min(1).max(1000).optional(),
  region: z.string().regex(/^[a-z]{2}$/i).default("IN"),
  sort: z.enum(["popularity.desc", "vote_average.desc", "date.desc"]).default("popularity.desc"),
  page: z.coerce.number().int().min(1).max(20).default(1),
  trending: z.enum(["true", "false"]).optional(),
  popular: z.enum(["true", "false"]).optional(),
}).superRefine((value, context) => {
  if (value.genreNames && !value.type) context.addIssue({ code: "custom", message: "mediaType is required when filtering by genre name" });
  if (value.yearMin && value.yearMax && value.yearMin > value.yearMax) context.addIssue({ code: "custom", message: "yearMin cannot exceed yearMax" });
  if (value.runtimeMin && value.runtimeMax && value.runtimeMin > value.runtimeMax) context.addIssue({ code: "custom", message: "runtimeMin cannot exceed runtimeMax" });
});
