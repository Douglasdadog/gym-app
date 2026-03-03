export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#000000] flex">
      <aside className="w-64 fixed left-0 top-0 h-screen glass border-r border-white/10 animate-pulse" />
      <main className="flex-1 ml-64 p-6 lg:p-8">
        <div className="h-8 w-48 bg-white/10 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-2xl p-6 h-24 animate-pulse">
              <div className="h-4 w-20 bg-white/10 rounded mb-2" />
              <div className="h-8 w-16 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
