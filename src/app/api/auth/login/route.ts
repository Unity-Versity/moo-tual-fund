import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { setSession } from "@/lib/session";
import { loginSchema, parseBody } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`login:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil((rl.retryAfterSeconds ?? 900) / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = parseBody(loginSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { data: household, error } = await supabase
    .from("households")
    .select("id, name, is_active, is_admin")
    .eq("pin_code", parsed.data.pin)
    .eq("is_active", true)
    .single();

  if (error || !household) {
    return NextResponse.json(
      { error: "Invalid PIN. Double-check and try again!" },
      { status: 401 }
    );
  }

  // Admin PIN → don't create session yet, just signal the client to show admin auth
  if (household.is_admin) {
    return NextResponse.json({ admin_redirect: true });
  }

  await setSession({
    type: "household",
    household_id: household.id,
    household_name: household.name,
  });

  return NextResponse.json({ success: true, name: household.name });
}
