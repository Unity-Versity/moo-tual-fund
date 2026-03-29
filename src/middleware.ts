import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "mootual_session";

function decodeSession(raw: string) {
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const session = sessionCookie ? decodeSession(sessionCookie) : null;

  if (pathname.startsWith("/admin")) {
    if (!session || session.type !== "admin") {
      return NextResponse.redirect(new URL("/login?admin=1", request.url));
    }
  }

  if (pathname.startsWith("/my-order")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/my-order/:path*"],
};
