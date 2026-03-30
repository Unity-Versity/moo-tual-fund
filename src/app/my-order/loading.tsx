export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
      <span className="text-4xl animate-bounce">🥩</span>
      <p className="text-sm text-muted-foreground animate-pulse">
        Fetching your cuts...
      </p>
    </div>
  );
}
