import { createServiceRoleClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { SetPinForm } from "./set-pin-form";

export const metadata = {
  title: "Set Your PIN",
  description: "You've been invited to join Moo-tual Fund. Set your PIN to get started.",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createServiceRoleClient();
  const { data: household } = await supabase
    .from("households")
    .select("id, name, is_active")
    .eq("invite_token", token)
    .single();

  if (!household) {
    notFound();
  }

  if (household.is_active) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <SetPinForm token={token} householdName={household.name} />
    </div>
  );
}
