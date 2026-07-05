import type { ReactNode } from "react";
import {
  clearAllExternalCardCache,
  clearExpiredExternalCardCache,
  importCollectionCsv,
  updateAppSettings,
} from "@/app/actions";
import { AppCard, PageHeader, SectionTitle, buttonClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    cache?: string;
    duplicates?: string;
    importError?: string;
    imported?: string;
    settings?: string;
    skipped?: string;
  }>;
}) {
  const result = await searchParams;
  const [settings, cacheCount, expiredCacheCount, latestCache] = await Promise.all([
    getAppSettings(),
    prisma.externalCardCache.count(),
    prisma.externalCardCache.count({ where: { expiresAt: { lt: new Date() } } }),
    prisma.externalCardCache.findFirst({ orderBy: { updatedAt: "desc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="設定" />

      {result.settings === "saved" ? (
        <div className="rounded-md border border-emerald-900/70 bg-emerald-950/30 p-3 text-sm text-emerald-200">
          設定を保存しました。
        </div>
      ) : null}

      <section>
        <SectionTitle title="CSVインポート / エクスポート" />
        <AppCard className="space-y-4 p-4">
          {result.imported ? (
            <div className="rounded-md border border-emerald-900/70 bg-emerald-950/30 p-3 text-sm text-emerald-200">
              CSVインポートが完了しました。追加 {result.imported} 件
              {result.skipped ? `、スキップ ${result.skipped} 件` : ""}
              {result.duplicates && result.duplicates !== "0" ? `、重複候補 ${result.duplicates} 件` : ""}
            </div>
          ) : null}
          {result.importError ? (
            <div className="rounded-md border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-200">
              {result.importError}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <a className={secondaryButtonClass} href="/api/export/import-template">
              インポートテンプレートCSV
            </a>
            <a className={secondaryButtonClass} href="/api/export/collection">
              登録済みカード一覧CSV
            </a>
          </div>

          <form action={importCollectionCsv} className="space-y-3 rounded-md border border-[#30312f] bg-[#121312] p-3">
            <div>
              <p className="font-semibold text-white">CSV一括追加</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                カード名をもとに既存DBとYGOPRODeckを検索し、画像が見つかった場合は自動で設定します。
              </p>
            </div>
            <input className={inputClass} name="csvFile" type="file" accept=".csv,text/csv" required />
            <button className={buttonClass} type="submit">
              CSVをインポート
            </button>
          </form>
        </AppCard>
      </section>

      <section>
        <SectionTitle title="外部カード情報キャッシュ" />
        <AppCard className="space-y-4 p-4">
          {result.cache ? (
            <div className="rounded-md border border-emerald-900/70 bg-emerald-950/30 p-3 text-sm text-emerald-200">
              キャッシュを更新しました。
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <CacheStat label="保存件数" value={`${cacheCount}件`} />
            <CacheStat label="期限切れ" value={`${expiredCacheCount}件`} />
            <CacheStat label="最終更新" value={latestCache ? latestCache.updatedAt.toLocaleDateString("ja-JP") : "-"} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <form action={clearExpiredExternalCardCache}>
              <button className={secondaryButtonClass} type="submit">
                期限切れだけ削除
              </button>
            </form>
            <form action={clearAllExternalCardCache}>
              <button className={secondaryButtonClass} type="submit">
                すべて削除
              </button>
            </form>
          </div>
        </AppCard>
      </section>

      <section>
        <SectionTitle title="表示とデフォルト値" />
        <AppCard className="p-4">
          <form action={updateAppSettings} className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-md border border-[#30312f] bg-[#121312] p-3">
              <div>
                <p className="font-semibold text-white">未所持カード画像表示</p>
                <p className="mt-1 text-xs text-zinc-500">OFFの場合、バインダーでは空きポケットとして表示します。</p>
              </div>
              <select className="w-36 rounded-md border border-[#30312f] bg-[#151616] px-3 py-2 text-sm font-semibold text-zinc-100 outline-none focus:border-amber-400" name="unownedBinderDisplay" defaultValue={settings.unownedBinderDisplay}>
                <option value="grayscale">表示する</option>
                <option value="hidden">表示しない</option>
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-zinc-300">デフォルト所持ステータス</span>
                <select className={inputClass} name="defaultOwnershipStatus" defaultValue={settings.defaultOwnershipStatus}>
                  <option value="OWNED">所持済み</option>
                  <option value="UNOWNED">未所持</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-zinc-300">デフォルト枚数</span>
                <input className={inputClass} min={0} name="defaultQuantity" type="number" defaultValue={settings.defaultQuantity} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-zinc-300">デフォルト状態</span>
                <select className={inputClass} name="defaultCondition" defaultValue={settings.defaultCondition}>
                  {["S", "A", "B", "C", "傷あり"].map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-zinc-300">デフォルト言語</span>
                <select className={inputClass} name="defaultLanguage" defaultValue={settings.defaultLanguage}>
                  {["日本語", "英語", "その他"].map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-zinc-300">デフォルト保管場所</span>
              <input className={inputClass} name="defaultStorage" defaultValue={settings.defaultStorage} placeholder="例: メインバインダー" />
            </label>

            <button className={buttonClass} type="submit">
              設定を保存
            </button>
          </form>
        </AppCard>
      </section>

      <section>
        <SectionTitle title="アプリ情報" />
        <AppCard className="divide-y divide-[#2f302e]">
          <SettingRow title="バージョン">
            <span className="text-sm text-zinc-400">1.0.0</span>
          </SettingRow>
          <SettingRow title="アプリ名">
            <span className="text-sm text-zinc-400">Duel Binder</span>
          </SettingRow>
        </AppCard>
      </section>
    </div>
  );
}

function CacheStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#30312f] bg-[#121312] p-3">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="font-semibold text-white">{title}</p>
        {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
