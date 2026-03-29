import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

// Step 1: Check if is_admin column exists by trying to query it
const { error: colCheck } = await supabase
  .from("households")
  .select("is_admin")
  .limit(1);

if (colCheck) {
  console.log("⚠️  The 'is_admin' column doesn't exist yet on the households table.");
  console.log("   Please run this one line in the Supabase SQL Editor:");
  console.log("");
  console.log("   ALTER TABLE public.households ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;");
  console.log("");
  console.log("   Then re-run this script.");
  process.exit(1);
}

console.log("✅ is_admin column exists");

// Step 2: Upsert the admin household
const { data, error } = await supabase
  .from("households")
  .upsert(
    { name: "Admin", pin_code: "008410", is_admin: true, is_active: true },
    { onConflict: "pin_code" }
  )
  .select();

if (error) {
  console.error("❌ Failed to create admin household:", error.message);
  process.exit(1);
}

console.log("✅ Admin household created/updated:", data);
console.log("🐄 Admin PIN: 008410");
