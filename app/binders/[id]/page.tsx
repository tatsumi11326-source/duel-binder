import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { addBinderPage, addOwnedCardToBinderEnd } from "@/app/actions";
import { BinderPageNavigator } from "@/components/binder-page-navigator";
import { BinderPocketGrid, type BinderPocketItem } from "@/components/binder-pocket-grid";
import { buttonClass, inputClass } from "@/components/ui";
import { getAppSettings } from "@/lib/app-settings";
import { includesNormalizedSearch, normalizeCardSearchText } from "@/lib/card-search";
import { prisma } from "@/lib/prisma";

type BinderDetailSearchParams = {
  add?: string;
  cardQ?: string;
  mode?: string;
  page?: string;
  selectedPage?: string;
  selectedPocket?: string;
};

type OwnedCardWithCard = Prisma.OwnedCardGetPayload<{
  include: {
    card: true;
  };
}>;

const pocketNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default async function BinderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<BinderDetailSearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const binderId = Number(id);
  const currentPage = Math.max(1, Number(query.page ?? 1) || 1);
  const mode = query.mode === "manage" ? "manage" : "view";
  const isAddMenuOpen = query.add === "1";
  const cardQuery = query.cardQ?.trim() ?? "";
  const selected =
    query.selectedPage && query.selectedPocket
      ? {
          page: Math.max(1, Number(query.selectedPage) || 1),
          pocket: Math.max(1, Number(query.selectedPocket) || 1),
        }
      : undefined;

  const [binder, ownedCards, settings] = await Promise.all([
    prisma.binder.findUnique({
      where: { id: binderId },
      include: {
        slots: {
          include: {
            ownedCard: {
              include: {
                card: true,
              },
            },
          },
          orderBy: [{ pageNumber: "asc" }, { pocketNumber: "asc" }],
        },
      },
    }),
    prisma.ownedCard.findMany({
      include: { card: true },
      orderBy: { updatedAt: "desc" },
    }),
    getAppSettings(),
  ]);

  if (!binder) notFound();

  const maxPage = Math.max(1, binder.pageCount, currentPage, ...binder.slots.map((slot) => slot.pageNumber));
  const currentSlots = binder.slots.filter((slot) => slot.pageNumber === currentPage);
  const slotByPocket = new Map(currentSlots.map((slot) => [slot.pocketNumber, slot]));
  const storedCount = binder.slots.filter((slot) => slot.ownedCardId).length;
  const pockets: BinderPocketItem[] = pocketNumbers.map((pocketNumber) => {
    const slot = slotByPocket.get(pocketNumber);
    const ownedCard = slot?.ownedCard;
    const card = ownedCard?.card;
    const shouldHideUnowned =
      mode === "view" && ownedCard?.ownershipStatus === "UNOWNED" && settings.unownedBinderDisplay === "hidden";

    if (shouldHideUnowned) {
      return {
        cardNumber: null,
        imageUrl: null,
        ownedCardId: null,
        ownershipStatus: null,
        pocketNumber,
        rarity: null,
        title: null,
      };
    }

    return {
      cardNumber: ownedCard?.cardNumber ?? card?.cardNumber ?? null,
      imageUrl: ownedCard?.photoUrl ?? card?.imageUrl ?? null,
      ownedCardId: ownedCard?.id ?? null,
      ownershipStatus: ownedCard?.ownershipStatus ?? null,
      pocketNumber,
      rarity: ownedCard?.rarity ?? card?.rarity ?? null,
      title: card?.japaneseName ?? null,
    };
  });
  const addMenuHref = binderHref(binder.id, currentPage, mode, true);
  const closeAddMenuHref = binderHref(binder.id, currentPage, mode);
  const addMenuOwnedCards = filterOwnedCardsForAddMenu(ownedCards, cardQuery);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg bg-[#0f1010] text-zinc-100 shadow-2xl shadow-black/60 ring-1 ring-[#30312f]">
        <div className="px-4 pb-6 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Link href="/binders" className="text-xl leading-none text-zinc-300 hover:text-white" aria-label="バインダー管理へ戻る">
                  ←
                </Link>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-white">{binder.name}</h1>
                  <p className="truncate text-xs text-zinc-400">{binder.description ?? "9ポケットでコレクションを管理"}</p>
                </div>
              </div>
              <p className="mt-5 text-sm text-zinc-400">
                {storedCount}枚収納 ・ {ownedCards.length}枚所持
              </p>
            </div>
            <Link
              href={addMenuHref}
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-amber-400 px-3 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-300"
            >
              + 追加
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 rounded-lg bg-[#2a2a2a] p-1 text-center text-sm font-semibold">
            <Link
              href={binderHref(binder.id, currentPage, "view")}
              className={mode === "view" ? "rounded-md bg-[#171717] py-2 text-white" : "py-2 text-zinc-400"}
            >
              閲覧モード
            </Link>
            <Link
              href={binderHref(binder.id, currentPage, "manage")}
              className={mode === "manage" ? "rounded-md bg-[#171717] py-2 text-white" : "py-2 text-zinc-400"}
            >
              整理モード
            </Link>
          </div>

          <BinderPageNavigator binderId={binder.id} currentPage={currentPage} maxPage={maxPage} mode={mode}>
            <div className="mt-4 rounded-lg border border-zinc-700 bg-[#171818] p-3">
              <BinderPocketGrid
                binderId={binder.id}
                currentPage={currentPage}
                isManageMode={mode === "manage"}
                pockets={pockets}
              />
              <div className="mt-4 flex items-center justify-center gap-2">
                {Array.from({ length: maxPage }, (_, index) => index + 1).map((page) => (
                  <Link
                    key={page}
                    href={binderHref(binder.id, page, mode, false, selected)}
                    className={`h-2.5 rounded-full ${page === currentPage ? "w-4 bg-amber-400" : "w-2.5 bg-zinc-600"}`}
                    aria-label={`${page}ページ目`}
                  />
                ))}
                <form action={addBinderPage.bind(null, binder.id, maxPage, mode)}>
                  <button className="ml-1 rounded-full border border-zinc-600 px-2 text-xs text-zinc-300" type="submit">
                    +
                  </button>
                </form>
              </div>
            </div>
          </BinderPageNavigator>
        </div>
      </section>

      {isAddMenuOpen ? (
        <AddCardMenu
          addedOwnedCardIds={new Set(
            binder.slots.map((slot) => slot.ownedCardId).filter((value): value is number => Boolean(value)),
          )}
          binderId={binder.id}
          cardQuery={cardQuery}
          closeHref={closeAddMenuHref}
          currentPage={currentPage}
          mode={mode}
          ownedCards={addMenuOwnedCards}
          totalOwnedCardCount={ownedCards.length}
        />
      ) : null}
    </div>
  );
}

function AddCardMenu({
  addedOwnedCardIds,
  binderId,
  cardQuery,
  closeHref,
  currentPage,
  mode,
  ownedCards,
  totalOwnedCardCount,
}: {
  addedOwnedCardIds: Set<number>;
  binderId: number;
  cardQuery: string;
  closeHref: string;
  currentPage: number;
  mode: "view" | "manage";
  ownedCards: OwnedCardWithCard[];
  totalOwnedCardCount: number;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 px-3 pb-20 pt-10 backdrop-blur-sm sm:items-center sm:pb-10"
      data-binder-swipe-ignore
    >
      <section className="max-h-[78vh] w-full max-w-[560px] overflow-hidden rounded-lg border border-[#30312f] bg-[#111211] shadow-2xl shadow-black/70">
        <div className="flex items-start justify-between gap-4 border-b border-[#30312f] px-4 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">カードを追加</h2>
            <p className="mt-1 text-sm text-zinc-400">コレクションのカードを最後尾のポケットへ追加します。</p>
          </div>
          <Link
            href={closeHref}
            className="rounded-md border border-[#30312f] px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:border-amber-400 hover:text-white"
            prefetch={false}
          >
            閉じる
          </Link>
        </div>

        <form action={`/binders/${binderId}`} className="border-b border-[#30312f] p-3">
          <input name="page" type="hidden" value={currentPage} />
          <input name="mode" type="hidden" value={mode} />
          <input name="add" type="hidden" value="1" />
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input className={inputClass} name="cardQ" placeholder="カード名・英語名・型番で検索" defaultValue={cardQuery} />
            <button className={buttonClass} type="submit">
              検索
            </button>
          </div>
          {cardQuery ? (
            <p className="mt-2 text-xs text-zinc-500">
              {totalOwnedCardCount}件中 {ownedCards.length}件を表示
            </p>
          ) : null}
        </form>

        {ownedCards.length === 0 ? (
          <div className="p-4">
            <div className="rounded-lg border border-dashed border-[#30312f] p-6 text-sm text-zinc-400">
              追加できる所持カードがありません。
              <div className="mt-4">
                <Link href="/collection/new" className={buttonClass}>
                  所持カードを登録
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto p-3">
            <div className="grid gap-2">
              {ownedCards.map((ownedCard) => (
                <AddCardRow
                  added={addedOwnedCardIds.has(ownedCard.id)}
                  binderId={binderId}
                  cardQuery={cardQuery}
                  key={ownedCard.id}
                  ownedCard={ownedCard}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function AddCardRow({
  added,
  binderId,
  cardQuery,
  ownedCard,
}: {
  added: boolean;
  binderId: number;
  cardQuery: string;
  ownedCard: OwnedCardWithCard;
}) {
  return (
    <form
      action={addOwnedCardToBinderEnd.bind(null, binderId)}
      className={`grid grid-cols-[56px_minmax(0,1fr)_76px] items-center gap-3 rounded-lg border p-2 ${
        added ? "border-emerald-800/70 bg-emerald-950/20" : "border-[#30312f] bg-[#171818]"
      }`}
    >
      <input name="ownedCardId" type="hidden" value={ownedCard.id} />
      <input name="cardQ" type="hidden" value={cardQuery} />
      <CardThumb ownedCard={ownedCard} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-white">{ownedCard.card.japaneseName}</p>
          {added ? (
            <span className="shrink-0 rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              追加済み
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-zinc-400">{ownedCard.cardNumber ?? ownedCard.card.cardNumber ?? "型番なし"}</p>
        <p className="mt-1 truncate text-xs font-semibold text-amber-400">
          {ownedCard.rarity ?? ownedCard.card.rarity ?? "レアリティ未設定"} ・ {ownedCard.condition}
        </p>
        <p className="mt-1 text-xs font-semibold text-zinc-500">
          {ownedCard.ownershipStatus === "UNOWNED" ? "未所持" : "所持済み"} ・ {ownedCard.quantity}枚
        </p>
      </div>
      <button
        className={`flex h-10 min-w-16 items-center justify-center rounded-full text-sm font-bold leading-none ${
          added ? "bg-emerald-900/70 text-emerald-200" : "bg-amber-400 text-zinc-950 hover:bg-amber-300"
        }`}
        aria-label={`${ownedCard.card.japaneseName}を追加`}
        type="submit"
      >
        {added ? "済" : "+ 追加"}
      </button>
    </form>
  );
}

function CardThumb({ ownedCard }: { ownedCard: OwnedCardWithCard }) {
  const imageUrl = ownedCard.photoUrl ?? ownedCard.card.imageUrl;
  const isOwned = ownedCard.ownershipStatus !== "UNOWNED";

  if (!imageUrl) {
    return (
      <div className="flex aspect-[3/4] w-14 items-center justify-center rounded border border-[#30312f] bg-[#202221] px-1 text-center text-[10px] text-zinc-500">
        No Image
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={ownedCard.card.japaneseName}
      className={`aspect-[3/4] w-14 rounded border border-[#30312f] object-cover ${isOwned ? "" : "grayscale opacity-55"}`}
    />
  );
}

function binderHref(
  binderId: number,
  page = 1,
  mode: "view" | "manage" = "view",
  add = false,
  selected?: { page: number; pocket: number },
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("mode", mode);
  if (add) params.set("add", "1");
  if (selected) {
    params.set("selectedPage", String(selected.page));
    params.set("selectedPocket", String(selected.pocket));
  }
  return `/binders/${binderId}?${params.toString()}`;
}

function filterOwnedCardsForAddMenu(ownedCards: OwnedCardWithCard[], query: string) {
  if (!query) return ownedCards;

  return ownedCards
    .filter(
      (ownedCard) =>
        includesNormalizedSearch(ownedCard.card.japaneseName, query) ||
        includesNormalizedSearch(ownedCard.card.englishName, query) ||
        includesNormalizedSearch(ownedCard.cardNumber, query) ||
        includesNormalizedSearch(ownedCard.card.cardNumber, query) ||
        includesNormalizedSearch(ownedCard.rarity, query) ||
        includesNormalizedSearch(ownedCard.card.rarity, query),
    )
    .sort((a, b) => scoreOwnedCardForAddMenu(b, query) - scoreOwnedCardForAddMenu(a, query));
}

function scoreOwnedCardForAddMenu(ownedCard: OwnedCardWithCard, query: string) {
  const normalizedQuery = normalizeCardSearchText(query);
  const values = [
    ownedCard.card.japaneseName,
    ownedCard.card.englishName,
    ownedCard.cardNumber,
    ownedCard.card.cardNumber,
    ownedCard.rarity,
    ownedCard.card.rarity,
  ].map((value) => normalizeCardSearchText(value ?? ""));

  if (values.some((value) => value === normalizedQuery)) return 100;
  if (values.some((value) => value.startsWith(normalizedQuery))) return 80;
  if (values.some((value) => value.includes(normalizedQuery))) return 60;
  return 0;
}
