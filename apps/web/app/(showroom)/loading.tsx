// Next.js renders this automatically while any (showroom) page's async
// server component is fetching — without it, the browser just shows a
// blank tab during that fetch, which reads as broken rather than loading.
export default function Loading() {
  return (
    <div className="max-w-[1240px] mx-auto px-8 py-16 animate-pulse">
      <div className="h-8 w-64 bg-black/5 rounded-sm mb-8" />
      <div className="grid grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-black/5 rounded-sm" />
        ))}
      </div>
    </div>
  );
}
