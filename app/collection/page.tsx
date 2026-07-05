import Link from "next/link";
import type { ReactNode } from "react";
import { Prisma } from "@prisma/client";
import { deleteOwnedCard } from "@/app/actions";
import { EmptyState, PageHeader, buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { yugiohJapaneseRarities } from "@/lib/rarities";

type CollectionSearchParams = {
  condition?: string;
  language?: string;
  placement?: string;
  q?: string;
  rarity?: string;
  sort?: string;
  status?: string;
};

const conditionOptions = ["S", "A", "B", "C", "傷あり"];
const languageOptions = ["日本語", "英語", "その他"];

export default async function CollectionPage({ searchParams }: { searchParams: Promise<CollectionSearchParams> }) {
  const filters = await searchParams;
  const ownedCards = await prisma.ownedCard.findMany({
    where: buildOwnedWhere(filters),
    include: {
      binderSlots: {
        include: { binder: true },
        orderBy: [{ binderId: "asc" }, { pageNumber: "asc" }, { pocketNumber: "asc" }],
      },
      card: true,
    },
    orderBy: buildOwnedOrder(filters.sort),
  });

  const ownedItems = ownedCards.filter((item) => item.ownershipStatus !== "UNOWNED");
  const totalQuantity = ownedItems.reduce((sum, item) => sum + item.quantity, 0);
  const unownedCount = ownedCards.length - ownedItems.length;
  const unplacedCount = ownedCards.filter((item) => item.binderSlots.length === 0).length;
  const isFiltered = hasActiveFilters(filters);

  return (
    <div className="space-y-4">
      <PageHeader title="コレクション" action={{ href: "/collection/new", label: "追加" }} />
      <CollectionFilterForm filters={filters} />

      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>
          {ownedCards.length}件 ・ {totalQuantity}枚所持
          {unownedCount > 0 ? ` ・ ${unownedCount}件未所持` : ""}
          {unplacedCount > 0 ? ` ・ ${unplacedCount}件未配置` : ""}
        </span>
        {isFiltered ? (
          <Link href="/collection" className={secondaryButtonClass}>
            条件をクリア
          </Link>
        ) : null}
      </div>

      {ownedCards.length === 0 ? (
        <EmptyState message={isFiltered ? "条件に合うカードがありません。" : "所持カードがありません。"} />
      ) : (
        <div className="space-y-3">
          {ownedCards.map((item) => {
            const imageUrl = item.photoUrl ?? item.card.imageUrl;
            const isOwned = item.ownershipStatus !== "UNOWNED";
            const placementLabel = buildPlacementLabel(item.binderSlots);
            return (
              <article key={item.id} className="rounded-lg border border-[#2f302e] bg-[#171818] p-3">
                <div className="flex gap-3">
                  <Link href={`/collection/${item.id}/edit`} className="shrink-0">
                    <div className="h-24 w-[68px] overflow-hidden rounded-md border border-[#30312f] bg-[#202120]">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.card.japaneseName}
                          className={`h-full w-full object-cover ${isOwned ? "" : "grayscale opacity-55"}`}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-500">No IMG</div>
                      )}
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/collection/${item.id}/edit`} className="block truncate font-bold text-white">
                      {item.card.japaneseName}
                    </Link>
                    <p className="mt-1 truncate text-xs text-zinc-500">{item.card.englishName ?? item.card.packName ?? ""}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <Badge>{item.cardNumber ?? item.card.cardNumber ?? "型番なし"}</Badge>
                      <Badge>{item.rarity ?? item.card.rarity ?? "レアリティ未設定"}</Badge>
                      <Badge tone={isOwned ? "owned" : "unowned"}>{isOwned ? "所持済み" : "未所持"}</Badge>
                      <Badge tone={item.binderSlots.length > 0 ? "placed" : "unplaced"}>
                        {item.binderSlots.length > 0 ? "配置済み" : "未配置"}
                      </Badge>
                      <Badge>{item.condition}</Badge>
                      <Badge>{item.quantity}枚</Badge>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {item.purchasePrice ? `¥${item.purchasePrice.toLocaleString("ja-JP")}` : "価格未設定"}
                      {item.storage ? ` / ${item.storage}` : ""}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{placementLabel}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/collection/${item.id}/edit`} className={secondaryButtonClass}>
                    編集
                  </Link>
                  <form action={deleteOwnedCard.bind(null, item.id)}>
                    <button className={secondaryButtonClass} type="submit">
                      削除
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CollectionFilterForm({ filters }: { filters: CollectionSearchParams }) {
  return (
    <form action="/collection" className="space-y-3 rounded-lg border border-[#2f302e] bg-[#171818] p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className={inputClass}
          name="q"
          placeholder="カード名・型番・レアリティで検索"
          defaultValue={filters.q ?? ""}
        />
        <button className={buttonClass} type="submit">
          検索
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <SelectFilter label="所持" name="status" value={filters.status}>
          <option value="">すべて</option>
          <option value="owned">所持済み</option>
          <option value="unowned">未所持</option>
        </SelectFilter>
        <SelectFilter label="配置" name="placement" value={filters.placement}>
          <option value="">すべて</option>
          <option value="placed">バインダー配置済み</option>
          <option value="unplaced">バインダー未配置</option>
        </SelectFilter>
        <SelectFilter label="並び順" name="sort" value={filters.sort}>
          <option value="">更新が新しい順</option>
          <option value="name">カード名順</option>
          <option value="cardNumber">型番順</option>
          <option value="rarity">レアリティ順</option>
          <option value="price">購入価格が高い順</option>
          <option value="condition">状態順</option>
        </SelectFilter>
        <SelectFilter label="レアリティ" name="rarity" value={filters.rarity}>
          <option value="">すべて</option>
          {yugiohJapaneseRarities.map((rarity) => (
            <option key={rarity} value={rarity}>
              {rarity}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter label="状態" name="condition" value={filters.condition}>
          <option value="">すべて</option>
          {conditionOptions.map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter label="言語" name="language" value={filters.language}>
          <option value="">すべて</option>
          {languageOptions.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </SelectFilter>
      </div>
    </form>
  );
}

function SelectFilter({
  children,
  label,
  name,
  value,
}: {
  children: ReactNode;
  label: string;
  name: string;
  value?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold text-zinc-400">{label}</span>
      <select className={inputClass} name={name} defaultValue={value ?? ""}>
        {children}
      </select>
    </label>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "owned" | "placed" | "unowned" | "unplaced";
}) {
  const colorClass =
    tone === "owned"
      ? "bg-emerald-950/60 text-emerald-300"
      : tone === "placed"
        ? "bg-blue-950/60 text-blue-300"
        : tone === "unowned"
          ? "bg-zinc-700/70 text-zinc-300"
          : tone === "unplaced"
            ? "bg-amber-950/60 text-amber-300"
            : "bg-[#222321] text-zinc-300";

  return <span className={`rounded px-2 py-1 font-semibold ${colorClass}`}>{children}</span>;
}

function buildOwnedWhere(filters: CollectionSearchParams): Prisma.OwnedCardWhereInput {
  const and: Prisma.OwnedCardWhereInput[] = [];
  const keyword = filters.q?.trim();

  if (keyword) {
    and.push({
      OR: [
        { cardNumber: { contains: keyword } },
        { rarity: { contains: keyword } },
        { condition: { contains: keyword } },
        { storage: { contains: keyword } },
        {
          card: {
            OR: [
              { japaneseName: { contains: keyword } },
              { englishName: { contains: keyword } },
              { cardNumber: { contains: keyword } },
              { packName: { contains: keyword } },
            ],
          },
        },
      ],
    });
  }

  if (filters.status === "owned") {
    and.push({ ownershipStatus: { not: "UNOWNED" } });
  } else if (filters.status === "unowned") {
    and.push({ ownershipStatus: "UNOWNED" });
  }

  if (filters.placement === "placed") {
    and.push({ binderSlots: { some: {} } });
  } else if (filters.placement === "unplaced") {
    and.push({ binderSlots: { none: {} } });
  }

  if (filters.rarity) {
    and.push({
      OR: [{ rarity: filters.rarity }, { card: { rarity: filters.rarity } }],
    });
  }

  if (filters.condition) and.push({ condition: filters.condition });
  if (filters.language) and.push({ language: filters.language });

  return and.length > 0 ? { AND: and } : {};
}

function buildOwnedOrder(sort?: string): Prisma.OwnedCardOrderByWithRelationInput[] {
  if (sort === "name") return [{ card: { japaneseName: "asc" } }, { updatedAt: "desc" }];
  if (sort === "cardNumber") return [{ cardNumber: "asc" }, { card: { cardNumber: "asc" } }, { updatedAt: "desc" }];
  if (sort === "rarity") return [{ rarity: "asc" }, { card: { rarity: "asc" } }, { updatedAt: "desc" }];
  if (sort === "price") return [{ purchasePrice: "desc" }, { updatedAt: "desc" }];
  if (sort === "condition") return [{ condition: "asc" }, { updatedAt: "desc" }];
  return [{ updatedAt: "desc" }];
}

function buildPlacementLabel(
  binderSlots: Array<{ binder: { name: string }; pageNumber: number; pocketNumber: number }>,
) {
  if (binderSlots.length === 0) return "バインダー未配置";
  return binderSlots
    .map((slot) => `${slot.binder.name} ${slot.pageNumber}P-${slot.pocketNumber}`)
    .join(" / ");
}

function hasActiveFilters(filters: CollectionSearchParams) {
  return Boolean(
    filters.condition ||
      filters.language ||
      filters.placement ||
      filters.q?.trim() ||
      filters.rarity ||
      filters.sort ||
      filters.status,
  );
}
