"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Eye } from "lucide-react";
import { updateSuggestionStatus } from "./actions";
import type { Suggestion } from "@/lib/types";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  noted: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
};

export function SuggestionActions({
  suggestions,
}: {
  suggestions: (Suggestion & { household: { name: string } })[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleUpdate(id: string, status: string) {
    startTransition(async () => {
      const result = await updateSuggestionStatus(id, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Marked as ${status}`);
      }
    });
  }

  return (
    <div className="space-y-2">
      {suggestions.map((s) => (
        <div key={s.id} className="rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {s.household?.name}
            </Badge>
            <Badge className={`text-xs ${STATUS_STYLES[s.status]}`}>
              {s.status}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-2 text-sm">{s.message}</p>
          {s.status === "pending" && (
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleUpdate(s.id, "noted")}
                disabled={isPending}
              >
                <Eye className="mr-1 h-3 w-3" />
                Note
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleUpdate(s.id, "resolved")}
                disabled={isPending}
              >
                <Check className="mr-1 h-3 w-3" />
                Resolve
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
