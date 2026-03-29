import { cookies } from "next/headers";
import type { SessionData } from "./types";

const COOKIE_NAME = "mootual_session";

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    return JSON.parse(decoded) as SessionData;
  } catch {
    return null;
  }
}

export async function setSession(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64");

  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireHousehold(): Promise<SessionData> {
  const session = await getSession();
  if (!session || session.type !== "household") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}
