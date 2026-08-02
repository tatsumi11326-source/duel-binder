export default function BinderDetailLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="バインダーを読み込み中">
      <section className="rounded-lg border border-[#30312f] bg-[#111211] p-4">
        <div className="h-6 w-40 rounded bg-[#292a29]" />
        <div className="mt-3 h-4 w-24 rounded bg-[#222322]" />
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-[#202120] p-1">
          <div className="h-9 rounded bg-[#2d2e2d]" />
          <div className="h-9 rounded bg-[#292a29]" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-[#30312f] p-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div className="aspect-[3/4] rounded bg-[#242524]" key={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
