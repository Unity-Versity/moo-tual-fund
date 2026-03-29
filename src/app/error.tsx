"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <span className="text-6xl">🐄😵</span>
      <h1 className="text-2xl font-bold">Holy Cow, Something Went Wrong!</h1>
      <p className="text-sm text-muted-foreground">
        The server had a cow. Give it another go?
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
