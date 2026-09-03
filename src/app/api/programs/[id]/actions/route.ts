import { NextResponse } from "next/server";
import { z } from "zod";
import { performAction, ProgramError } from "@/lib/programs";
import { validateProgram } from "@/lib/validation";
import { getSessionId } from "@/lib/session";

const constraintsSchema = z.object({
  runtimeMax: z.number().int().min(30).max(400).nullable().optional(),
  languages: z.array(z.string().trim().min(2).max(40)).max(12).optional(),
  genres: z.array(z.string().trim().min(2).max(40)).max(12).optional(),
  providers: z.array(z.string().trim().min(2).max(80)).max(20).optional(),
  yearMin: z.number().int().min(1888).max(2200).nullable().optional(),
  yearMax: z.number().int().min(1888).max(2200).nullable().optional(),
  region: z.string().trim().length(2).optional(),
  notes: z.string().trim().max(600).optional(),
}).strict();

const actionSchema = z.object({
  action: z.enum([
    "add_movie",
    "replace_movie",
    "remove_movie",
    "reorder_movies",
    "add_media",
    "replace_media",
    "remove_media",
    "reorder_media",
    "set_lock",
    "veto_movie",
    "veto_media",
    "remove_veto",
    "update_constraints",
    "mark_watched",
    "record_reaction",
  ]),
  actor: z.enum(["human", "agent"]).default("human"),
  expectedVersion: z.number().int().positive().optional(),
  itemId: z.string().optional(),
  itemIds: z.array(z.string()).optional(),
  mediaType: z.enum(["movie", "tv"]).optional(),
  tmdbId: z.number().int().positive().optional(),
  seasonNumber: z.number().int().nonnegative().nullable().optional(),
  explanation: z.string().max(600).optional(),
  reason: z.string().max(500).optional(),
  locked: z.boolean().optional(),
  watched: z.boolean().optional(),
  reaction: z.enum(["Loved it", "Wild", "Not for me"]).nullable().optional(),
  constraints: constraintsSchema.optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionId = await getSessionId();
    const input = actionSchema.parse(await request.json());
    const editToken = new URL(request.url).searchParams.get("edit");
    const program = await performAction(id, sessionId, input, editToken);
    return NextResponse.json({ program, validation: validateProgram(program) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid action" }, { status: 400 });
    if (error instanceof ProgramError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) return NextResponse.json({ error: "The lineup changed. Try again." }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the lineup" }, { status: 500 });
  }
}
