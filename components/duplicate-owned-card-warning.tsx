"use client";

import { useEffect, useRef, useState } from "react";

type DuplicateMatch = {
  cardNumber: string | null;
  condition: string;
  id: number;
  japaneseName: string;
  language: string;
  quantity: number;
  rarity: string | null;
  storage: string | null;
};

type DuplicateOwnedCardWarningProps = {
  excludeOwnedCardId?: number;
};

export function DuplicateOwnedCardWarning({ excludeOwnedCardId }: DuplicateOwnedCardWarningProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let abortController: AbortController | null = null;

    const check = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const formData = new FormData(form);
        const cardId = String(formData.get("cardId") ?? "");
        const japaneseName = String(formData.get("japaneseName") ?? "");
        const englishName = String(formData.get("englishName") ?? "");
        const cardNumber = String(formData.get("cardNumber") ?? "");
        const rarity = String(formData.get("rarity") ?? "");
        const language = String(formData.get("language") ?? "");

        if (!cardId && !japaneseName && !englishName && !cardNumber) {
          setMatches([]);
          return;
        }

        abortController?.abort();
        abortController = new AbortController();
        const params = new URLSearchParams();
        if (cardId) params.set("cardId", cardId);
        if (japaneseName) params.set("japaneseName", japaneseName);
        if (englishName) params.set("englishName", englishName);
        if (cardNumber) params.set("cardNumber", cardNumber);
        if (rarity) params.set("rarity", rarity);
        if (language) params.set("language", language);
        if (excludeOwnedCardId) params.set("excludeOwnedCardId", String(excludeOwnedCardId));

        setIsChecking(true);
        try {
          const response = await fetch(`/api/duplicate-check?${params.toString()}`, {
            signal: abortController.signal,
          });
          if (!response.ok) return;
          const data = (await response.json()) as { matches: DuplicateMatch[] };
          setMatches(data.matches);
        } catch {
          if (!abortController.signal.aborted) setMatches([]);
        } finally {
          if (!abortController.signal.aborted) setIsChecking(false);
        }
      }, 350);
    };

    check();
    form.addEventListener("change", check);
    form.addEventListener("input", check);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      abortController?.abort();
      form.removeEventListener("change", check);
      form.removeEventListener("input", check);
    };
  }, [excludeOwnedCardId]);

  return (
    <div ref={containerRef} aria-live="polite">
      {matches.length > 0 ? (
        <div className="rounded-md border border-amber-900/70 bg-amber-950/30 p-3 text-sm text-amber-100">
          <p className="font-bold">似たカードが既に登録されています。登録は続行できます。</p>
          <div className="mt-2 space-y-1 text-xs text-amber-100/85">
            {matches.map((match) => (
              <p key={match.id}>
                {match.japaneseName} / {match.cardNumber ?? "型番なし"} / {match.rarity ?? "レアリティ未設定"} /{" "}
                {match.language} / {match.condition} / {match.quantity}枚
                {match.storage ? ` / ${match.storage}` : ""}
              </p>
            ))}
          </div>
        </div>
      ) : isChecking ? (
        <p className="text-xs text-zinc-500">重複候補を確認中...</p>
      ) : null}
    </div>
  );
}
