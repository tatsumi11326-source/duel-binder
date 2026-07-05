import { collectionCsvHeaders, csvResponse } from "@/lib/csv";

export async function GET() {
  return csvResponse("duel-binder-import-template.csv", [
    [...collectionCsvHeaders],
    [
      "クリボー",
      "Kuriboh",
      "MRD-JP071",
      "Metal Raiders",
      "ノーマル",
      "A",
      "1",
      "OWNED",
      "日本語",
      "",
      "",
      "",
      "未分類",
      "サンプル行です。不要なら削除してください。",
      "",
    ],
  ]);
}
