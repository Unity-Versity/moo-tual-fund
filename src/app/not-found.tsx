import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <span className="text-6xl">🐄💨</span>
      <h1 className="text-2xl font-bold">404 — That Cow Has Left the Paddock</h1>
      <p className="text-sm text-muted-foreground">
        We looked everywhere, but this page has mooo-ved on.
      </p>
      <Link href="/">
        <Button>Back to the Farm</Button>
      </Link>
    </div>
  );
}
