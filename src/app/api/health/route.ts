import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export function GET() {
  try {
    sqlite.prepare("SELECT 1").get();
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
