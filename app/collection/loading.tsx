export default function CollectionLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-label="コレクションを読み込み中">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 rounded bg-[#292a29]" />
        <div className="h-10 w-16 rounded bg-[#292a29]" />
      </div>
      <div className="h-10 rounded bg-[#202120]" />
      {Array.from({ length: 6 }, (_, index) => (
        <div className="flex h-24 gap-3 rounded-xl border border-[#30312f] bg-[#171818] p-3" key={index}>
          <div className="h-full w-14 rounded bg-[#292a29]" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-2/3 rounded bg-[#292a29]" />
            <div className="h-3 w-1/3 rounded bg-[#242524]" />
            <div className="h-5 w-1/2 rounded bg-[#242524]" />
          </div>
        </div>
      ))}
    </div>
  );
}
