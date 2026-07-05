import Link from "next/link";
import type { Card, OwnedCard } from "@prisma/client";
import { CardNumberInput } from "@/components/card-number-input";
import { DuplicateOwnedCardWarning } from "@/components/duplicate-owned-card-warning";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/components/ui";
import type { AppSettings } from "@/lib/app-settings";
import { yugiohJapaneseRarities } from "@/lib/rarities";

type OwnedCardFormValue = Partial<OwnedCard> & { card?: Card };

export function OwnedCardForm({
  cards,
  cardNumberSuggestions = [],
  settings,
  ownedCard,
  returnTo = "/collection",
  action,
  refreshImageAction,
  submitLabel,
}: {
  cards: Card[];
  cardNumberSuggestions?: string[];
  settings: AppSettings;
  ownedCard?: OwnedCardFormValue;
  returnTo?: string;
  action: (formData: FormData) => void;
  refreshImageAction?: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} encType="multipart/form-data" className="space-y-5 rounded-lg border border-[#2f302e] bg-[#171818] p-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="space-y-2">
        <span className={labelClass}>カードマスタ</span>
        <select className={inputClass} name="cardId" required defaultValue={ownedCard?.cardId ?? ""}>
          <option value="">選択してください</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.japaneseName}
            </option>
          ))}
        </select>
      </label>
      <DuplicateOwnedCardWarning excludeOwnedCardId={ownedCard?.id} />

      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-2">
          <span className={labelClass}>所持ステータス</span>
          <select className={inputClass} name="ownershipStatus" defaultValue={ownedCard?.ownershipStatus ?? settings.defaultOwnershipStatus}>
            <option value="OWNED">所持済み</option>
            <option value="UNOWNED">未所持</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>所持枚数</span>
          <input className={inputClass} name="quantity" type="number" min={0} defaultValue={ownedCard?.quantity ?? settings.defaultQuantity} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-2">
          <span className={labelClass}>状態</span>
          <select className={inputClass} name="condition" defaultValue={ownedCard?.condition ?? settings.defaultCondition}>
            {["S", "A", "B", "C", "傷あり"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>レアリティ</span>
          <select className={inputClass} name="rarity" defaultValue={ownedCard?.rarity ?? ""}>
            <option value="">選択してください</option>
            {yugiohJapaneseRarities.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CardNumberInput defaultValue={ownedCard?.cardNumber ?? ""} suggestions={cardNumberSuggestions} />
        <label className="space-y-2">
          <span className={labelClass}>言語</span>
          <select className={inputClass} name="language" defaultValue={ownedCard?.language ?? settings.defaultLanguage}>
            {["日本語", "英語", "その他"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-2">
          <span className={labelClass}>購入価格</span>
          <input className={inputClass} name="purchasePrice" type="number" defaultValue={ownedCard?.purchasePrice ?? ""} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>購入日</span>
          <input
            className={inputClass}
            name="purchaseDate"
            type="date"
            defaultValue={ownedCard?.purchaseDate ? ownedCard.purchaseDate.toISOString().slice(0, 10) : ""}
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className={labelClass}>購入店舗</span>
        <input className={inputClass} name="purchaseShop" defaultValue={ownedCard?.purchaseShop ?? ""} />
      </label>
      <label className="space-y-2">
        <span className={labelClass}>保管場所</span>
        <input className={inputClass} name="storage" defaultValue={ownedCard?.storage ?? settings.defaultStorage} />
      </label>
      <div className="grid gap-4 sm:grid-cols-[96px_1fr]">
        <div className="h-32 w-24 overflow-hidden rounded-md border border-[#30312f] bg-[#202120]">
          {ownedCard?.photoUrl || ownedCard?.card?.imageUrl ? (
            <img
              src={ownedCard.photoUrl ?? ownedCard.card?.imageUrl ?? ""}
              alt={ownedCard.card?.japaneseName ?? "カード画像"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-500">No IMG</div>
          )}
        </div>
        <div className="space-y-4">
          <label className="space-y-2">
            <span className={labelClass}>写真ファイル</span>
            <input className={inputClass} name="photoFile" type="file" accept="image/*" />
            <p className="text-xs text-zinc-500">ローカル画像を選ぶと、写真URLより優先して保存されます。</p>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>写真URL</span>
            <input className={inputClass} name="photoUrl" defaultValue={ownedCard?.photoUrl ?? ""} />
          </label>
          {refreshImageAction ? (
            <button className={secondaryButtonClass} formAction={refreshImageAction} type="submit">
              YGOPRODeckから画像を再取得
            </button>
          ) : null}
        </div>
      </div>
      <label className="block space-y-2">
        <span className={labelClass}>メモ</span>
        <textarea className={inputClass} name="memo" rows={4} defaultValue={ownedCard?.memo ?? ""} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Link href={returnTo} className={secondaryButtonClass}>
          キャンセル
        </Link>
        <button className={buttonClass} type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
