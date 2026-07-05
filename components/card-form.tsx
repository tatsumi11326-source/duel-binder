import Link from "next/link";
import type { Card } from "@prisma/client";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/components/ui";

const textFields = [
  ["japaneseName", "カード名 *", true],
  ["englishName", "英語名", false],
  ["cardNumber", "型番", false],
  ["packName", "シリーズ / パック", false],
  ["rarity", "レアリティ", false],
  ["cardType", "カード種別", false],
  ["attribute", "属性", false],
  ["race", "種族", false],
  ["imageUrl", "カード画像URL", false],
] as const;

const numberFields = [
  ["level", "レベル"],
  ["atk", "攻撃力"],
  ["def", "守備力"],
] as const;

export function CardForm({
  card,
  action,
  submitLabel,
}: {
  card?: Card;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5 rounded-lg border border-[#2f302e] bg-[#171818] p-4">
      <div className="rounded-lg border border-[#30312f] bg-[#121312] p-4 text-sm text-zinc-400">
        <p className="font-semibold text-amber-400">カードデータベースから検索して自動入力</p>
        <p className="mt-1 text-xs">YGOPRODeck連携は今後追加予定です。まずは手入力で登録できます。</p>
      </div>

      <div className="grid gap-4">
        {textFields.map(([name, label, required]) => (
          <label key={name} className="space-y-2">
            <span className={labelClass}>{label}</span>
            <input
              className={inputClass}
              name={name}
              required={required}
              defaultValue={(card?.[name] as string | null | undefined) ?? ""}
            />
          </label>
        ))}
        <div className="grid grid-cols-3 gap-3">
          {numberFields.map(([name, label]) => (
            <label key={name} className="space-y-2">
              <span className={labelClass}>{label}</span>
              <input
                className={inputClass}
                name={name}
                type="number"
                defaultValue={(card?.[name] as number | null | undefined) ?? ""}
              />
            </label>
          ))}
        </div>
      </div>

      <label className="block space-y-2">
        <span className={labelClass}>効果テキスト</span>
        <textarea className={inputClass} name="description" rows={5} defaultValue={card?.description ?? ""} />
      </label>
      <label className="block space-y-2">
        <span className={labelClass}>備考</span>
        <textarea className={inputClass} name="notes" rows={3} defaultValue={card?.notes ?? ""} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/cards" className={secondaryButtonClass}>
          キャンセル
        </Link>
        <button className={buttonClass} type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
