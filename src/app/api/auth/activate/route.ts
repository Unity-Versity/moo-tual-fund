import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { setSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  let body: { token?: string; pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  if (!token || !pin) {
    return NextResponse.json(
      { error: "Token and PIN are required" },
      { status: 400 }
    );
  }

  if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return NextResponse.json(
      { error: "PIN must be 4–6 digits." },
      { status: 400 }
    );
  }

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
