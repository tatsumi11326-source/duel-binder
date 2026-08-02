export default function OwnedCardDetailLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-label="カード詳細を読み込み中">
      <div className="h-4 w-32 rounded bg-zinc-800" />
      <div className="h-8 w-64 max-w-full rounded bg-zinc-800" />
      <section className="grid gap-5 rounded-lg border border-[#30312f] bg-[#171818] p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="mx-auto aspect-[3/4] w-full max-w-[180px] rounded-lg bg-zinc-800" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="space-y-2 border-b border-[#30312f] pb-2">
              <div className="h-3 w-14 rounded bg-zinc-800" />
              <div className="h-4 w-24 max-w-full rounded bg-zinc-700" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
