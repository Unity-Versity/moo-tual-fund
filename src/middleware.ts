import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "mootual_session";

async function verifyAndDecode(raw: string, secret: string) {
  const dotIndex = raw.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payload = raw.slice(0, dotIndex);
  const signature = raw.slice(dotIndex + 1);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (signature !== expected) return null;

  try {
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return NextResponse.next();
  }

  const session = sessionCookie ? await verifyAndDecode(sessionCookie, secret) : null;

  if (pathname.startsWith("/admin")) {
    if (!session || session.type !== "admin") {
      return NextResponse.redirect(new URL("/login?admin=1", request.url));
    }
  }

  if (pathname.startsWith("/my-order")) {
    if (!session || (session.type !== "household" && session.type !== "admin")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/my-order/:path*"],
};
