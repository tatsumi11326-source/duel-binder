"use client";

import { useFormStatus } from "react-dom";

export function MarkOwnedButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full rounded-md bg-amber-400 px-2 py-2 text-xs font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:bg-amber-700"
      disabled={pending}
      type="submit"
    >
      {pending ? "更新中…" : "所持済みにする"}
    </button>
  );
}
