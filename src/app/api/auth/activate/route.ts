import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { setSession } from "@/lib/session";
import { activateSchema, parseBody } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`activate:${ip}`);
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

  const parsed = parseBody(activateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { token, pin } = parsed.data;
  const supabase = await createServiceRoleClient();

  const { data: existing } = await supabase
    .from("households")
    .select("id, pin_code")
    .eq("pin_code", pin)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "That PIN is already taken. Pick a different one!" },
      { status: 409 }
    );
  }

  const { data: household, error: fetchError } = await supabase
    .from("households")
    .select("id, name, is_active")
    .eq("invite_token", token)
    .single();

  if (fetchError || !household) {
    return NextResponse.json(
      { error: "Invalid invite link." },
      { status: 404 }
    );
  }

  if (household.is_active) {
    return NextResponse.json(
      { error: "This household is already set up. Head to login instead!" },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabase
    .from("households")
    .update({ pin_code: pin, is_active: true })
    .eq("id", household.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to set PIN. Try again!" },
      { status: 500 }
    );
  }

  await setSession({
    type: "household",
    household_id: household.id,
    household_name: household.name,
  });

  return NextResponse.json({ success: true });
}
