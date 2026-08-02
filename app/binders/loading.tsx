export default function BindersLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-label="バインダー一覧を読み込み中">
      <div className="flex items-center justify-between pt-2">
        <div className="h-6 w-28 rounded bg-[#292a29]" />
        <div className="h-10 w-16 rounded bg-[#292a29]" />
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div className="h-24 rounded-lg border border-[#30312f] bg-[#171818]" key={index} />
      ))}
    </div>
  );
}
