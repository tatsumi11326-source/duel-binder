import { Prisma } from "@prisma/client";
import { createWishlistItem, deleteWishlistItem, toggleWishlistPurchased } from "@/app/actions";
import { EmptyState, PageHeader, buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/components/ui";
import { SearchBox } from "@/components/search-box";
import { prisma } from "@/lib/prisma";

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cardName?: string }>;
}) {
  const { q, cardName } = await searchParams;
  const items = await prisma.wishlistItem.findMany({
    where: buildWishlistWhere(q),
    orderBy: [{ purchased: "asc" }, { priority: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <PageHeader title="欲しいカード" />
      <SearchBox action="/wishlist" placeholder="カード名・型番・メモで検索" defaultValue={q} />

      <section className="rounded-lg border border-[#2f302e] bg-[#171818] p-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">欲しいカード追加</h2>
        <form action={createWishlistItem} className="space-y-4">
          <Field name="cardName" label="カード名" required defaultValue={cardName ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <Field name="cardNumber" label="型番" />
            <Field name="desiredRarity" label="希望レアリティ" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className={labelClass}>希望状態</span>
              <select className={inputClass} name="desiredCondition" defaultValue="A">
                {["S", "A", "B", "C", "傷あり"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className={labelClass}>優先度</span>
              <select className={inputClass} name="priority" defaultValue="中">
                {["高", "中", "低"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Field name="budget" label="予算" type="number" />
          <label className="space-y-2">
            <span className={labelClass}>メモ</span>
            <input className={inputClass} name="memo" />
          </label>
          <button className={buttonClass} type="submit">
            追加する
          </button>
        </form>
      </section>

      {items.length === 0 ? (
        <EmptyState message="欲しいカードがありません。" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-[#2f302e] bg-[#171818] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-white">{item.cardName}</h2>
                  <p className="mt-2 text-xs text-zinc-400">
                    {item.cardNumber ?? "-"} / {item.desiredRarity ?? "-"} / {item.desiredCondition ?? "-"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.budget ? `¥${item.budget.toLocaleString("ja-JP")}` : "予算未設定"}
                  </p>
                  {item.memo ? <p className="mt-2 text-sm text-zinc-400">{item.memo}</p> : null}
                </div>
                <span className="rounded bg-[#222321] px-2 py-1 text-xs font-bold text-amber-400">{item.priority}</span>
              </div>
              {item.purchased ? <p className="mt-3 text-xs font-semibold text-emerald-400">購入済み</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={toggleWishlistPurchased.bind(null, item.id, !item.purchased)}>
                  <button className={secondaryButtonClass} type="submit">
                    {item.purchased ? "未購入に戻す" : "購入済みにする"}
                  </button>
                </form>
                <form action={deleteWishlistItem.bind(null, item.id)}>
                  <button className={secondaryButtonClass} type="submit">
                    削除
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="space-y-2">
      <span className={labelClass}>{label}</span>
      <input className={inputClass} name={name} type={type} required={required} defaultValue={defaultValue ?? ""} />
    </label>
  );
}

function buildWishlistWhere(q?: string): Prisma.WishlistItemWhereInput {
  if (!q?.trim()) return {};
  const keyword = q.trim();
  return {
    OR: [
      { cardName: { contains: keyword } },
      { cardNumber: { contains: keyword } },
      { desiredRarity: { contains: keyword } },
      { desiredCondition: { contains: keyword } },
      { memo: { contains: keyword } },
    ],
  };
}
