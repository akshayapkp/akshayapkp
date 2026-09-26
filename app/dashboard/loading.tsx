export default function DashboardLoading() {
  return (
    <div className="min-h-[60vh] p-6" aria-live="polite" aria-busy="true">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
