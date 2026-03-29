export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-2">
        <span className="text-2xl animate-bounce">🤠</span>
        <p className="text-sm text-muted-foreground animate-pulse">
          Saddling up the dashboard...
        </p>
      </div>
    </div>
  );
}
