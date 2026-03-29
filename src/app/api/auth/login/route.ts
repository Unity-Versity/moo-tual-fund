import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { setSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  let body: { pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  if (!pin) {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { data: household, error } = await supabase
    .from("households")
    .select("id, name, is_active, is_admin")
    .eq("pin_code", pin)
    .single();

  if (error || !household) {
    return NextResponse.json(
      { error: "Invalid invite code. Double-check and try again!" },
      { status: 401 }
    );
  }

  if (!household.is_active) {
    return NextResponse.json(
      { error: "This household has been deactivated. Contact the admin." },
      { status: 403 }
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
