import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { setSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { pin } = await request.json();

  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { data: household, error } = await supabase
    .from("households")
    .select("id, name, is_active")
    .eq("pin_code", pin.trim())
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

  await setSession({
    type: "household",
    household_id: household.id,
    household_name: household.name,
  });

  return NextResponse.json({ success: true, name: household.name });
}
