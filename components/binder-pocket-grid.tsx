"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearBinderSlot, reorderBinderPageSlotsFromForm } from "@/app/actions";

export type BinderPocketItem = {
  cardNumber: string | null;
  imageUrl: string | null;
  ownedCardId: number | null;
  ownershipStatus: string | null;
  pocketNumber: number;
  rarity: string | null;
  title: string | null;
};

type SortMode = "swap" | "insert";

type BinderPocketGridProps = {
  binderId: number;
  currentPage: number;
  isManageMode: boolean;
  pockets: BinderPocketItem[];
};

export function BinderPocketGrid({ binderId, currentPage, isManageMode, pockets }: BinderPocketGridProps) {
  const router = useRouter();
  const [sortMode, setSortMode] = useState<SortMode>("swap");
  const [selectedPocket, setSelectedPocket] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);
  const fromRef = useRef<HTMLInputElement | null>(null);
  const toRef = useRef<HTMLInputElement | null>(null);
  const operationRef = useRef<HTMLInputElement | null>(null);
  const selectedPocketItem = selectedPocket ? pockets.find((pocket) => pocket.pocketNumber === selectedPocket) : null;

  const onPocketClick = (pocket: BinderPocketItem) => {
    if (isPending) return;

    if (!isManageMode) {
      if (pocket.ownedCardId) {
        const returnTo = `/binders/${binderId}?page=${currentPage}&mode=view`;
        router.push(`/collection/${pocket.ownedCardId}/edit?returnTo=${encodeURIComponent(returnTo)}`);
      }
      return;
    }

    if (!selectedPocket) {
      if (!pocket.ownedCardId) return;
      setSelectedPocket(pocket.pocketNumber);
      return;
    }

    if (selectedPocket === pocket.pocketNumber) {
      setSelectedPocket(null);
      return;
    }

    const fromPocket = selectedPocket;
    const toPocket = pocket.pocketNumber;
    setSelectedPocket(null);
    startTransition(() => {
      if (!formRef.current || !fromRef.current || !toRef.current || !operationRef.current) return;
      fromRef.current.value = String(fromPocket);
      toRef.current.value = String(toPocket);
      operationRef.current.value = sortMode;
      formRef.current.requestSubmit();
    });
  };

  return (
    <div className="space-y-3">
      <form action={reorderBinderPageSlotsFromForm.bind(null, binderId, currentPage)} className="hidden" ref={formRef}>
        <input name="fromPocket" ref={fromRef} type="hidden" />
        <input name="toPocket" ref={toRef} type="hidden" />
        <input name="operation" ref={operationRef} type="hidden" />
      </form>

      {isManageMode ? (
        <div
          className="relative z-20 flex items-center justify-between gap-3 rounded-lg border border-[#30312f] bg-[#171818] p-2"
          data-binder-swipe-ignore
          data-testid="binder-sort-mode"
        >
          <div className="text-xs font-semibold text-zinc-400">
            {selectedPocket ? `選択中: ${selectedPocket}` : "操作モード"}
          </div>
          <div className="grid grid-cols-2 rounded-md bg-[#222322] p-1 text-xs font-bold">
            <button
              className={`rounded px-3 py-1.5 ${
                sortMode === "swap" ? "bg-amber-400 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => {
                setSortMode("swap");
                setSelectedPocket(null);
              }}
              type="button"
            >
              交換
            </button>
            <button
              className={`rounded px-3 py-1.5 ${
                sortMode === "insert" ? "bg-amber-400 text-zinc-950" : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => {
                setSortMode("insert");
                setSelectedPocket(null);
              }}
              type="button"
            >
              挿入
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {pockets.map((pocket) => {
          const isOwned = pocket.ownershipStatus !== "UNOWNED";

          return (
          <button
            key={pocket.pocketNumber}
            className={`min-w-0 rounded-md border bg-[#101111] p-1.5 text-left transition ${
              selectedPocket === pocket.pocketNumber
                ? "border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.25)]"
                : "border-zinc-700"
            } ${
              isManageMode || pocket.ownedCardId
                ? "hover:border-amber-400/80"
                : "cursor-default"
            }`}
            aria-label={
              pocket.ownedCardId
                ? isManageMode
                  ? `${pocket.title ?? "カード"}を選択`
                  : `${pocket.title ?? "カード"}を編集`
                : `${pocket.pocketNumber}番ポケット`
            }
            data-testid={`binder-pocket-${pocket.pocketNumber}`}
            disabled={isPending || (!isManageMode && !pocket.ownedCardId)}
            onClick={() => onPocketClick(pocket)}
            type="button"
          >
            <div className="relative overflow-hidden rounded border border-zinc-700 bg-[#202221]">
              {pocket.imageUrl ? (
                <img
                  src={pocket.imageUrl}
                  alt={pocket.title ?? `${pocket.pocketNumber}番ポケット`}
                  className={`aspect-[3/4] w-full object-cover ${isOwned ? "" : "grayscale opacity-55"}`}
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 px-2 text-center text-xs text-zinc-500">
                  {pocket.title ?? `EMPTY ${pocket.pocketNumber}`}
                </div>
              )}
              {!pocket.ownedCardId ? <div className="absolute inset-0 bg-black/35" /> : null}
              {pocket.ownedCardId && !isOwned ? (
                <div className="absolute right-1 top-1 rounded bg-zinc-800/90 px-1.5 py-0.5 text-[10px] font-bold text-zinc-200">
                  未所持
                </div>
              ) : null}
              {selectedPocket === pocket.pocketNumber ? (
                <div className="absolute left-1 top-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-zinc-950">
                  選択
                </div>
              ) : null}
            </div>
            <div className="mt-1 min-h-10">
              <p className="truncate text-[10px] font-bold leading-4 text-amber-400">
                {pocket.rarity ?? "空きポケット"}
              </p>
              <p className="truncate text-[10px] leading-3 text-zinc-400">
                {pocket.cardNumber ?? `Pocket ${pocket.pocketNumber}`}
              </p>
            </div>
          </button>
          );
        })}
      </div>

      {isManageMode ? (
        <div className="space-y-2">
          {selectedPocketItem?.ownedCardId ? (
            <form action={clearBinderSlot.bind(null, binderId, currentPage, selectedPocketItem.pocketNumber)}>
              <button
                className="w-full rounded-md border border-red-900/70 bg-red-950/25 px-3 py-2 text-sm font-bold text-red-200 hover:border-red-600 hover:bg-red-950/40"
                type="submit"
              >
                {selectedPocketItem.pocketNumber}番ポケットから外す
              </button>
            </form>
          ) : null}
          <p className="text-xs leading-5 text-zinc-500">
            1枚目を選択してから2枚目を選ぶと、選択中の操作モードで移動します。選択中のカードはこのバインダーから外せます。
          </p>
        </div>
      ) : null}
    </div>
  );
}
