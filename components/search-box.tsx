import { inputClass } from "@/components/ui";

export function SearchBox({
  action,
  placeholder,
  defaultValue,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <form action={action} className="mb-4 flex gap-2">
      <input className={inputClass} name="q" placeholder={placeholder} defaultValue={defaultValue ?? ""} />
      <button
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-amber-400 px-4 text-sm font-bold text-[#111111] hover:bg-amber-300"
        type="submit"
      >
        検索
      </button>
    </form>
  );
}
