import Link from "next/link";
import { createBinder, deleteBinder } from "@/app/actions";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";

type BindersSearchParams = {
  new?: string;
};

const binderColors = ["#d19a1d", "#168143", "#1e4d8f", "#982c28", "#64288c", "#1d6b79", "#7a551f", "#4a4a4a"];

export default async function BindersPage({ searchParams }: { searchParams: Promise<BindersSearchParams> }) {
  const { new: newBinder } = await searchParams;
  const isCreateOpen = newBinder === "1";
  const binders = await prisma.binder.findMany({
    include: {
      slots: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 pt-2">
        <h1 className="text-xl font-bold text-white">バインダー</h1>
        <Link href="/binders?new=1" className={buttonClass}>
          新規
        </Link>
      </div>

      <div className="space-y-3">
        {binders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#30312f] bg-[#171818] p-8 text-center text-sm text-zinc-400">
            まだバインダーがありません。新規作成から最初のバインダーを作成してください。
          </div>
        ) : (
          binders.map((binder) => {
            const storedCount = binder.slots.filter((slot) => slot.ownedCardId).length;
            const pageCount = Math.max(binder.pageCount, ...binder.slots.map((slot) => slot.pageNumber), 1);

            return (
              <article
                key={binder.id}
                className="group rounded-lg border border-[#30312f] bg-[#121312] p-4 shadow-lg shadow-black/20 transition hover:border-amber-400/80"
                style={{ borderLeftColor: binder.color, borderLeftWidth: 3 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/binders/${binder.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-lg"
                      style={{ borderColor: binder.color, color: binder.color }}
                    >
                      ▣
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold text-white group-hover:text-amber-300">
                        {binder.name}
                      </span>
                      <span className="mt-1 block truncate text-sm text-zinc-400">
                        {binder.description ?? "説明なし"}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {storedCount}枚 / {pageCount}ページ
                      </span>
                    </span>
                  </Link>
                  <form action={deleteBinder.bind(null, binder.id)}>
                    <button className="rounded-md px-2 py-1 text-xs font-semibold text-zinc-500 hover:text-red-300" type="submit">
                      削除
                    </button>
                  </form>
                </div>
              </article>
            );
          })
        )}
      </div>

      {isCreateOpen ? <CreateBinderDialog /> : null}
    </div>
  );
}

function CreateBinderDialog() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-lg rounded-lg border border-[#30312f] bg-[#121312] p-6 shadow-2xl shadow-black">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-white">新規バインダー</h2>
          <Link href="/binders" className="text-2xl leading-none text-zinc-400 hover:text-white" aria-label="閉じる">
            ×
          </Link>
        </div>

        <form action={createBinder} className="mt-5 space-y-5">
          <label className="block space-y-2">
            <span className={labelClass}>バインダー名 *</span>
            <input className={inputClass} name="name" placeholder="例: 8期レリーフ" required />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>説明</span>
            <input className={inputClass} name="description" placeholder="任意" />
          </label>
          <fieldset className="space-y-2">
            <legend className={labelClass}>カラー</legend>
            <div className="flex flex-wrap gap-3">
              {binderColors.map((color, index) => (
                <label key={color} className="relative block h-8 w-8 cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="color"
                    value={color}
                    defaultChecked={index === 0}
                  />
                  <span
                    className="block h-8 w-8 rounded-full border border-transparent peer-checked:border-white peer-focus:outline peer-focus:outline-2 peer-focus:outline-amber-300"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/binders" className={secondaryButtonClass}>
              キャンセル
            </Link>
            <button className={buttonClass} type="submit">
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
