import "server-only";

import { cookies } from "next/headers";
import { sqlite } from "./db";

const COOKIE_NAME = "bingewatcher_session";

export async function getSessionId() {
  const store = await cookies();
  let id = store.get(COOKIE_NAME)?.value;
  const now = new Date().toISOString();

  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    store.set(COOKIE_NAME, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  sqlite
    .prepare("INSERT INTO sessions (id, created_at, last_seen_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at")
    .run(id, now, now);

  return id;
}
