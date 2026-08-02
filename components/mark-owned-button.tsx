"use client";

import { useFormStatus } from "react-dom";

export function MarkOwnedButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="flex h-9 w-full items-center justify-center rounded-md bg-emerald-500 px-3 text-xs font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:bg-emerald-800 disabled:text-emerald-200"
      disabled={pending}
      type="submit"
    >
      {pending ? "更新中…" : "✓ 所持済みに変更"}
    </button>
  );
}
