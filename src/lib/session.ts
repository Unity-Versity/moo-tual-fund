import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { SessionData } from "./types";

const COOKIE_NAME = "mootual_session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is required");
  return secret;
}

function sign(payload: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(payload);
  return hmac.digest("hex");
}

function encode(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decode(raw: string): SessionData | null {
  const dotIndex = raw.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payload = raw.slice(0, dotIndex);
  const signature = raw.slice(dotIndex + 1);

  const expected = sign(payload);

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const json = Buffer.from(payload, "base64").toString("utf-8");
    const data = JSON.parse(json) as SessionData;
    if (!data.type || (data.type !== "admin" && data.type !== "household")) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decode(raw);
}

export async function setSession(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const value = encode(data);

  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireHousehold(): Promise<SessionData> {
  const session = await getSession();
  if (!session || session.type !== "household" || !session.household_id) {
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
