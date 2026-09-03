import { NextResponse } from "next/server";
import { z } from "zod";
import { createProgram, listPrograms } from "@/lib/programs";
import { getSessionId } from "@/lib/session";

const createSchema = z.object({
  title: z.string().trim().min(2).max(80),
  prompt: z.string().trim().min(5).max(600),
  targetSize: z.number().int().min(1).max(20).default(6),
  region: z.string().trim().length(2).default("IN"),
  actor: z.enum(["human", "agent"]).default("human"),
});

export async function GET() {
  try {
    return NextResponse.json({ programs: listPrograms(await getSessionId()) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load lineups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = createSchema.parse(await request.json());
    const sessionId = await getSessionId();
    const { region, ...programInput } = input;
    const program = createProgram({ sessionId, ...programInput, constraints: { region: region.toUpperCase() } });
    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid lineup" }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Could not create the lineup" }, { status: 500 });
  }
}
