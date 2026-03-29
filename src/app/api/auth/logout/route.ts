import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Best-effort Supabase signout
  }

  await clearSession();
  return NextResponse.json({ success: true });
}
