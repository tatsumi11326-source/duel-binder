"use client";

import { useMemo, useState, useTransition } from "react";
import { importSearchCandidateToCollection } from "@/app/actions";
import { CardNumberInput } from "@/components/card-number-input";
import { DuplicateOwnedCardWarning } from "@/components/duplicate-owned-card-warning";
import { buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import type { CardSearchCandidate } from "@/lib/card-search";
import type { AppSettings } from "@/lib/app-settings";
import { yugiohJapaneseRarities } from "@/lib/rarities";

type CandidateState = {
  cardNumber: string;
  imageUrl: string;
  printIndex: number;
  rarity: string;
};

export function CardSearchImport({ settings }: { settings: AppSettings }) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<CardSearchCandidate[]>([]);
  const [candidateState, setCandidateState] = useState<Record<string, CandidateState>>({});
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canSearch = query.trim().length >= 2;

  const search = () => {
    if (!canSearch) return;
    setError(null);
    setHasSearched(true);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/card-search?q=${encodeURIComponent(query.trim())}`);
        if (!response.ok) throw new Error("検索に失敗しました");
        const data = (await response.json()) as { candidates: CardSearchCandidate[] };
        setCandidates(data.candidates);
        setCandidateState(
          Object.fromEntries(
            data.candidates.map((candidate) => {
              const firstPrint = candidate.prints[0];
              return [
                candidate.id,
                {
                  cardNumber: firstPrint?.cardNumber ?? "",
                  imageUrl: candidate.imageUrl ?? "",
                  printIndex: 0,
                  rarity: normalizeRarity(firstPrint?.rarity),
                },
              ];
            }),
          ),
        );
      } catch {
        setCandidates([]);
        setError("検索に失敗しました。通信状態を確認してください。");
      }
    });
  };

  return (
    <section className="space-y-4 rounded-lg border border-[#2f302e] bg-[#171818] p-4">
      <div>
        <h2 className="text-lg font-bold text-white">カード検索から追加</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          カード名を入力すると、ローカルDBと外部カードDBから候補を探します。中点や空白などは無視して検索します。
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className={inputClass}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              search();
            }
          }}
          placeholder="例: ブラックマジシャン / Blue-Eyes / LB-01"
          value={query}
        />
        <button className={buttonClass} disabled={!canSearch || isPending} onClick={search} type="button">
          {isPending ? "検索中" : "検索"}
        </button>
      </div>

      {error ? <p className="rounded-md border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</p> : null}

      {candidates.length > 0 ? (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <CandidateCard
              candidate={candidate}
              key={candidate.id}
              onStateChange={(nextState) =>
                setCandidateState((current) => ({
                  ...current,
                  [candidate.id]: nextState,
                }))
              }
              state={
                candidateState[candidate.id] ?? {
                  cardNumber: candidate.prints[0]?.cardNumber ?? "",
                  imageUrl: candidate.imageUrl ?? "",
                  printIndex: 0,
                  rarity: normalizeRarity(candidate.prints[0]?.rarity),
                }
              }
              settings={settings}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#30312f] p-5 text-sm text-zinc-400">
          {hasSearched
            ? "候補が見つかりませんでした。日本語名の場合は英語名や型番でも検索してみてください。"
            : "カード名を検索すると候補がここに表示されます。"}
        </div>
      )}
    </section>
  );
}

function CandidateCard({
  candidate,
  onStateChange,
  state,
  settings,
}: {
  candidate: CardSearchCandidate;
  onStateChange: (state: CandidateState) => void;
  state: CandidateState;
  settings: AppSettings;
}) {
  const prints = candidate.prints.length > 0 ? candidate.prints : [{ cardNumber: null, packName: null, rarity: null }];
  const selectedPrint = prints[state.printIndex] ?? prints[0];
  const cardNumberSuggestions = prints
    .map((print) => print.cardNumber)
    .filter((value): value is string => Boolean(value));
  const imageUrls = candidate.imageUrls.length > 0 ? candidate.imageUrls : [candidate.imageUrl ?? ""].filter(Boolean);
  const previewImage = state.imageUrl || candidate.imageUrl;
  const sourceLabel = candidate.source === "local" ? "ローカル" : "YGOPRODeck";

  const hiddenFields = useMemo(
    () => ({
      atk: candidate.atk ?? "",
      attribute: candidate.attribute ?? "",
      cardType: candidate.cardType ?? "",
      def: candidate.def ?? "",
      description: candidate.description ?? "",
      englishName: candidate.englishName ?? "",
      imageUrl: state.imageUrl || candidate.imageUrl || "",
      japaneseName: candidate.japaneseName,
      level: candidate.level ?? "",
      packName: selectedPrint.packName ?? "",
      race: candidate.race ?? "",
      source: candidate.source,
    }),
    [candidate, selectedPrint, state.imageUrl],
  );

  return (
    <form
      action={importSearchCandidateToCollection}
      encType="multipart/form-data"
      className="grid gap-3 rounded-lg border border-[#30312f] bg-[#121312] p-3"
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <DuplicateOwnedCardWarning />

      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
        {previewImage ? (
          <img
            alt={candidate.japaneseName}
            className="aspect-[3/4] w-[72px] rounded border border-[#30312f] object-cover"
            src={previewImage}
          />
        ) : (
          <div className="flex aspect-[3/4] w-[72px] items-center justify-center rounded border border-[#30312f] bg-[#202221] px-2 text-center text-[10px] text-zinc-500">
            No Image
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white">{candidate.japaneseName}</p>
              {candidate.englishName ? <p className="truncate text-xs text-zinc-500">{candidate.englishName}</p> : null}
            </div>
            <span className="shrink-0 rounded bg-[#202221] px-2 py-1 text-[10px] font-bold text-zinc-400">{sourceLabel}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{candidate.description ?? "効果テキストなし"}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400">既存候補</span>
          <select
            className={inputClass}
            onChange={(event) => {
              const printIndex = Number(event.target.value);
              const print = prints[printIndex] ?? prints[0];
              onStateChange({
                ...state,
                cardNumber: print.cardNumber ?? state.cardNumber,
                printIndex,
                rarity: normalizeRarity(print.rarity) || state.rarity,
              });
            }}
            value={state.printIndex}
          >
            {prints.map((print, index) => (
              <option key={`${print.cardNumber}-${print.rarity}-${index}`} value={index}>
                {[print.cardNumber ?? "型番なし", print.rarity ?? "レアリティなし"].join(" / ")}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400">画像</span>
          <select
            className={inputClass}
            onChange={(event) => onStateChange({ ...state, imageUrl: event.target.value })}
            value={state.imageUrl}
          >
            {imageUrls.length === 0 ? <option value="">画像なし</option> : null}
            {imageUrls.map((imageUrl, index) => (
              <option key={`${imageUrl}-${index}`} value={imageUrl}>
                画像 {index + 1}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CardNumberInput
          label="型番"
          onChange={(cardNumber) => onStateChange({ ...state, cardNumber })}
          suggestions={cardNumberSuggestions}
          value={state.cardNumber}
        />
        <label className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400">レアリティ</span>
          <select
            className={inputClass}
            name="rarity"
            onChange={(event) => onStateChange({ ...state, rarity: event.target.value })}
            value={state.rarity}
          >
            <option value="">選択してください</option>
            {yugiohJapaneseRarities.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400">所持ステータス</span>
          <select className={inputClass} name="ownershipStatus" defaultValue={settings.defaultOwnershipStatus}>
            <option value="OWNED">所持済み</option>
            <option value="UNOWNED">未所持</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400">枚数</span>
          <input className={inputClass} min={0} name="quantity" type="number" defaultValue={settings.defaultQuantity} />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400">状態</span>
          <select className={inputClass} name="condition" defaultValue={settings.defaultCondition}>
            {["S", "A", "B", "C", "傷あり"].map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400">言語</span>
          <select className={inputClass} name="language" defaultValue={settings.defaultLanguage}>
            {["日本語", "英語", "その他"].map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputClass} name="storage" placeholder="保管場所 任意" defaultValue={settings.defaultStorage} />
          <input className={inputClass} name="photoFile" type="file" accept="image/*" />
        </div>
        <button className={secondaryButtonClass} type="submit">
          コレクションに追加
        </button>
      </div>
    </form>
  );
}

function normalizeRarity(value: string | null | undefined) {
  if (!value) return "";
  return yugiohJapaneseRarities.includes(value as (typeof yugiohJapaneseRarities)[number]) ? value : "";
}
