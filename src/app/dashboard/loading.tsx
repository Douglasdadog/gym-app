export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#000000]">
      <header className="border-b border-white/10 sticky top-0 z-50 glass animate-pulse">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="h-8 w-32 bg-white/10 rounded" />
          <div className="flex gap-4">
            <div className="h-4 w-20 bg-white/10 rounded" />
            <div className="h-4 w-16 bg-white/10 rounded" />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-9 w-48 bg-white/10 rounded mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="glass rounded-2xl p-6 min-h-[180px] animate-pulse"
            >
              <div className="h-5 w-24 bg-white/10 rounded mb-4" />
              <div className="h-12 w-full bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
