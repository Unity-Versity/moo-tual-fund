import { formatDistanceToNow } from "date-fns";
import type { CowStatus } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { Megaphone } from "lucide-react";

export function StatusBanner({ status }: { status: CowStatus | null }) {
  if (!status) return null;

  const timeAgo = formatDistanceToNow(new Date(status.updated_at), { addSuffix: true });

  return (
    <div className="bg-primary/10 border-b border-primary/20">
      <div className="mx-auto flex max-w-2xl items-start gap-3 px-4 py-3">
        <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">
            {STAGE_LABELS[status.stage] ?? status.stage}
          </p>
          {status.banner_message && (
            <p className="mt-0.5 text-sm text-foreground/80">
              {status.banner_message}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
}
