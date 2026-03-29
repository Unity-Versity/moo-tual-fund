export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <div className="relative h-16 w-16">
        <span className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">
          🐄
        </span>
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        Rounding up the herd...
      </p>
    </div>
  );
}
