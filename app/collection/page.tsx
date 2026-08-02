import Link from "next/link";
import { unstable_cache } from "next/cache";
import type { ReactNode } from "react";
import { Prisma } from "@prisma/client";
import { deleteOwnedCards, updateOwnedCardsOwnership } from "@/app/actions";
import { Pagination } from "@/components/pagination";
import { EmptyState, PageHeader, buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { getAppSettings, type CollectionCardSize } from "@/lib/app-settings";
import { toCardThumbnailUrl } from "@/lib/card-image-url";
import { prisma } from "@/lib/prisma";
import { yugiohJapaneseRarities } from "@/lib/rarities";

type CollectionSearchParams = Record<string, string | undefined> & {
  bulkDelete?: string;
  bulkDeleted?: string;
  bulkStatus?: string;
  bulkUpdate?: string;
  bulkUpdated?: string;
  condition?: string;
  language?: string;
  manage?: string;
  page?: string;
  placement?: string;
  q?: string;
  rarity?: string;
  sort?: string;
  status?: string;
};

const conditionOptions = ["S", "A", "B", "C", "傷あり"];
const languageOptions = ["日本語", "英語", "その他"];
const itemsPerPage = 30;

const ownedCardSelect = {
  id: true,
  cardId: true,
  cardNumber: true,
  condition: true,
  ownershipStatus: true,
  photoUrl: true,
  purchasePrice: true,
  quantity: true,
  rarity: true,
  storage: true,
  binderSlots: {
    select: {
      pageNumber: true,
      pocketNumber: true,
      binder: { select: { name: true } },
    },
    orderBy: [{ binderId: "asc" }, { pageNumber: "asc" }, { pocketNumber: "asc" }],
  },
  card: {
    select: {
      cardNumber: true,
      englishName: true,
      imageUrl: true,
      japaneseName: true,
      packName: true,
      rarity: true,
    },
  },
} satisfies Prisma.OwnedCardSelect;

type OwnedCardListItem = Prisma.OwnedCardGetPayload<{ select: typeof ownedCardSelect }>;

type CollectionDataFilters = Pick<
  CollectionSearchParams,
  "condition" | "language" | "placement" | "q" | "rarity" | "sort" | "status"
>;

const getCachedCollectionPage = unstable_cache(
  async (filters: CollectionDataFilters, currentPage: number) => {
    const where = buildOwnedWhere(filters);
    const [ownedCards, totalMatches] = await Promise.all([
      prisma.ownedCard.findMany({
        where,
        select: ownedCardSelect,
        orderBy: buildOwnedOrder(filters.sort),
        skip: (currentPage - 1) * itemsPerPage,
        take: itemsPerPage,
      }),
      prisma.ownedCard.count({ where }),
    ]);
    return { ownedCards, totalMatches };
  },
  ["duel-binder-collection-page-v1"],
  { revalidate: 60 * 60, tags: ["collection-data"] },
);

export default async function CollectionPage({ searchParams }: { searchParams: Promise<CollectionSearchParams> }) {
  const filters = await searchParams;
  const currentPage = Math.max(1, Number(filters.page ?? 1) || 1);
  const manageMode = filters.manage === "1";
  const [{ ownedCards, totalMatches }, settings] = await Promise.all([
    getCachedCollectionPage(toCollectionDataFilters(filters), currentPage),
    getAppSettings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatches / itemsPerPage));
  const isFiltered = hasActiveFilters(filters);
  const paginationParams = clearTransientParams(filters);

  return (
    <div className="space-y-4">
      <PageHeader title="コレクション" action={{ href: "/collection/new", label: "＋ 追加" }} />
      <CollectionNotice filters={filters} />
      <CollectionFilterForm filters={filters} manageMode={manageMode} />

      <div className="flex items-center justify-between gap-3 text-sm text-zinc-400">
        <span className="min-w-0 truncate">
          {totalMatches}件
          {totalPages > 1 ? ` ・ ${currentPage}/${totalPages}ページ` : ""}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {isFiltered ? (
            <Link href={manageMode ? "/collection?manage=1" : "/collection"} className="text-xs text-zinc-500 hover:text-amber-300">
              クリア
            </Link>
          ) : null}
          <Link href={manageModeHref(filters, !manageMode)} className={secondaryButtonClass}>
            {manageMode ? "閲覧に戻る" : "管理"}
          </Link>
        </div>
      </div>

      {ownedCards.length === 0 ? (
        <EmptyState message={isFiltered ? "条件に合うカードがありません。" : "所持カードがありません。"} />
      ) : manageMode ? (
        <form action={deleteOwnedCards} className="space-y-3">
          <BulkActionBar />
          <div className="space-y-2">
            {ownedCards.map((item) => (
              <CollectionItem cardSize={settings.collectionCardSize} item={item} key={item.id} manageMode />
            ))}
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {ownedCards.map((item) => (
            <CollectionItem cardSize={settings.collectionCardSize} item={item} key={item.id} />
          ))}
        </div>
      )}

      <Pagination
        basePath="/collection"
        currentPage={currentPage}
        searchParams={paginationParams}
        totalPages={totalPages}
      />
    </div>
  );
}

function CollectionNotice({ filters }: { filters: CollectionSearchParams }) {
  return (
    <>
      {filters.bulkDeleted ? (
        <div className="rounded-md border border-emerald-900/70 bg-emerald-950/30 p-3 text-sm text-emerald-200">
          選択した所持カード {filters.bulkDeleted} 件を削除しました。
        </div>
      ) : null}
      {filters.bulkDelete === "none" ? (
        <div className="rounded-md border border-amber-900/70 bg-amber-950/30 p-3 text-sm text-amber-100">
          削除するカードを選択してください。
        </div>
      ) : null}
      {filters.bulkUpdated ? (
        <div className="rounded-md border border-emerald-900/70 bg-emerald-950/30 p-3 text-sm text-emerald-200">
          選択した所持カード {filters.bulkUpdated} 件を
          {filters.bulkStatus === "UNOWNED" ? "未所持" : "所持済み"}に変更しました。
        </div>
      ) : null}
      {filters.bulkUpdate === "none" ? (
        <div className="rounded-md border border-amber-900/70 bg-amber-950/30 p-3 text-sm text-amber-100">
          所持状態を変更するカードを選択してください。
        </div>
      ) : null}
    </>
  );
}

function BulkActionBar() {
  return (
    <div className="space-y-3 rounded-lg border border-[#2f302e] bg-[#171818] p-3 text-sm text-zinc-400">
      <p>変更したいカードにチェックを入れてください。</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <select className={inputClass} name="bulkOwnershipStatus" defaultValue="OWNED">
          <option value="OWNED">所持済みに変更</option>
          <option value="UNOWNED">未所持に変更</option>
        </select>
        <button className={secondaryButtonClass} formAction={updateOwnedCardsOwnership} type="submit">
          所持状態を変更
        </button>
        <button
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-red-900/70 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200 hover:border-red-500 hover:text-red-100"
          type="submit"
        >
          選択したカードを削除
        </button>
      </div>
    </div>
  );
}

function CollectionItem({
  cardSize,
  item,
  manageMode = false,
}: {
  cardSize: CollectionCardSize;
  item: OwnedCardListItem;
  manageMode?: boolean;
}) {
  const imageUrl = toCardThumbnailUrl(item.photoUrl ?? item.card.imageUrl);
  const isOwned = item.ownershipStatus !== "UNOWNED";
  const placementLabel = buildPlacementLabel(item.binderSlots);
  const size = cardSizeStyles[cardSize];

  return (
    <article className={`flex items-center gap-3 rounded-xl border border-[#2f302e] bg-[#171818] ${size.padding}`}>
      {manageMode ? (
        <label className="flex shrink-0 items-center justify-center self-stretch px-1">
          <input
            aria-label={`${item.card.japaneseName}を選択`}
            className="h-4 w-4 accent-amber-400"
            name="ownedCardIds"
            type="checkbox"
            value={item.id}
          />
        </label>
      ) : null}
      <Link href={`/collection/${item.id}/edit`} className="shrink-0">
        <div className={`${size.image} overflow-hidden rounded-md border border-[#30312f] bg-[#202120]`}>
          {imageUrl ? (
            <img
              alt={item.card.japaneseName}
              className={`h-full w-full object-cover ${isOwned ? "" : "grayscale opacity-55"}`}
              decoding="async"
              loading="lazy"
              src={imageUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-zinc-500">No IMG</div>
          )}
        </div>
      </Link>
      <Link href={`/collection/${item.id}/edit`} className="min-w-0 flex-1 py-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className={`${size.title} truncate font-bold text-white`}>{item.card.japaneseName}</h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{item.cardNumber ?? item.card.cardNumber ?? "型番なし"}</p>
          </div>
          <Badge tone={isOwned ? "owned" : "unowned"}>{isOwned ? "所持" : "未所持"}</Badge>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
          <Badge>{item.rarity ?? item.card.rarity ?? "レアリティ未設定"}</Badge>
          <Badge tone={item.binderSlots.length > 0 ? "placed" : "unplaced"}>
            {item.binderSlots.length > 0 ? "配置済み" : "未配置"}
          </Badge>
          {cardSize !== "small" ? <Badge>{item.condition}</Badge> : null}
          <Badge>{item.quantity}枚</Badge>
        </div>
        {cardSize !== "small" ? <p className="mt-1.5 truncate text-[11px] text-zinc-500">{placementLabel}</p> : null}
        {cardSize === "large" ? (
          <p className="mt-1 text-xs text-zinc-500">
            {item.purchasePrice ? `¥${item.purchasePrice.toLocaleString("ja-JP")}` : "価格未設定"}
            {item.storage ? ` / ${item.storage}` : ""}
          </p>
        ) : null}
      </Link>
    </article>
  );
}

function CollectionFilterForm({ filters, manageMode }: { filters: CollectionSearchParams; manageMode: boolean }) {
  return (
    <form action="/collection" className="space-y-3">
      {manageMode ? <input name="manage" type="hidden" value="1" /> : null}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className={inputClass}
          name="q"
          placeholder="カード名・型番で検索..."
          defaultValue={filters.q ?? ""}
        />
        <button className={buttonClass} type="submit">
          検索
        </button>
      </div>

      <details className="rounded-lg border border-[#2f302e] bg-[#171818]" open={hasAdvancedFilters(filters)}>
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-zinc-300">フィルタ・並び順</summary>
        <div className="grid grid-cols-2 gap-2 border-t border-[#2f302e] p-3 sm:grid-cols-3">
          <SelectFilter label="所持" name="status" value={filters.status}>
            <option value="">すべて</option>
            <option value="owned">所持済み</option>
            <option value="unowned">未所持</option>
          </SelectFilter>
          <SelectFilter label="配置" name="placement" value={filters.placement}>
            <option value="">すべて</option>
            <option value="placed">配置済み</option>
            <option value="unplaced">未配置</option>
          </SelectFilter>
          <SelectFilter label="並び順" name="sort" value={filters.sort}>
            <option value="">新しい順</option>
            <option value="oldest">古い順</option>
            <option value="name">名前順</option>
            <option value="cardNumber">型番順</option>
            <option value="rarity">レアリティ順</option>
            <option value="price">購入価格順</option>
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
        <div className="border-t border-[#2f302e] p-3">
          <button className={secondaryButtonClass} type="submit">
            条件を適用
          </button>
        </div>
      </details>
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

  return <span className={`shrink-0 rounded px-1.5 py-1 font-semibold ${colorClass}`}>{children}</span>;
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
    and.push({ OR: [{ rarity: filters.rarity }, { card: { rarity: filters.rarity } }] });
  }

  if (filters.condition) and.push({ condition: filters.condition });
  if (filters.language) and.push({ language: filters.language });

  return and.length > 0 ? { AND: and } : {};
}

function buildOwnedOrder(sort?: string): Prisma.OwnedCardOrderByWithRelationInput[] {
  if (sort === "oldest") return [{ updatedAt: "asc" }];
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
  return binderSlots.map((slot) => `${slot.binder.name} ${slot.pageNumber}P-${slot.pocketNumber}`).join(" / ");
}

function hasActiveFilters(filters: CollectionSearchParams) {
  return Boolean(filters.q?.trim() || hasAdvancedFilters(filters));
}

function hasAdvancedFilters(filters: CollectionSearchParams) {
  return Boolean(
    filters.condition || filters.language || filters.placement || filters.rarity || filters.sort || filters.status,
  );
}

function manageModeHref(filters: CollectionSearchParams, enabled: boolean) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(clearTransientParams(filters))) {
    if (value && key !== "manage") params.set(key, value);
  }
  if (enabled) params.set("manage", "1");
  const query = params.toString();
  return query ? `/collection?${query}` : "/collection";
}

function clearTransientParams(filters: CollectionSearchParams): CollectionSearchParams {
  return {
    ...filters,
    bulkDelete: undefined,
    bulkDeleted: undefined,
    bulkStatus: undefined,
    bulkUpdate: undefined,
    bulkUpdated: undefined,
  };
}

function toCollectionDataFilters(filters: CollectionSearchParams): CollectionDataFilters {
  return {
    condition: filters.condition,
    language: filters.language,
    placement: filters.placement,
    q: filters.q,
    rarity: filters.rarity,
    sort: filters.sort,
    status: filters.status,
  };
}

const cardSizeStyles: Record<CollectionCardSize, { image: string; padding: string; title: string }> = {
  small: { image: "h-16 w-11", padding: "p-2", title: "text-sm" },
  medium: { image: "h-20 w-14", padding: "p-3", title: "text-sm" },
  large: { image: "h-28 w-20", padding: "p-4", title: "text-base" },
};
