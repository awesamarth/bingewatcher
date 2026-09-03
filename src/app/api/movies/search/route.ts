import { NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ error: "Enter at least two characters" }, { status: 400 });

  try {
    return NextResponse.json(await searchMovies(query));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Movie search failed" }, { status: 502 });
  }
}
