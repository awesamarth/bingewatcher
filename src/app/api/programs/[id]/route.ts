import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteProgram, getProgram, ProgramError } from "@/lib/programs";
import { validateProgram } from "@/lib/validation";
import { getSessionId } from "@/lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionId = await getSessionId();
    const search = new URL(request.url).searchParams;
    const program = getProgram(id, sessionId, search.get("share"), search.get("edit"));
    return NextResponse.json({ program, validation: validateProgram(program) });
  } catch (error) {
    if (error instanceof ProgramError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Could not load the lineup" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { expectedVersion } = z.object({ expectedVersion: z.number().int().positive() }).parse(await request.json());
    const { id } = await params;
    const search = new URL(request.url).searchParams;
    deleteProgram(id, await getSessionId(), expectedVersion, search.get("edit"));
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    if (error instanceof ProgramError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Could not delete the lineup" }, { status: 500 });
  }
}
