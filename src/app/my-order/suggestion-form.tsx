"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2 } from "lucide-react";
import { submitSuggestion } from "./actions";
import type { Suggestion } from "@/lib/types";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  noted: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
};

export function SuggestionForm({ suggestions }: { suggestions: Suggestion[] }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    startTransition(async () => {
      const result = await submitSuggestion(message);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Suggestion sent! We'll have a look 🐄");
        setMessage("");
      }
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. We'd prefer not to get ox tongue if possible"
          className="min-h-[60px] flex-1 text-sm"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send suggestion"
          className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90"
          disabled={isPending || !message.trim()}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Your previous suggestions:
          </p>
          {suggestions.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="text-sm">{s.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge className={`shrink-0 text-xs ${STATUS_STYLES[s.status]}`}>
                  {s.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
