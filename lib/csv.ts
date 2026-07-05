export const collectionCsvHeaders = [
  "カード名",
  "英語名",
  "型番",
  "パック名",
  "レアリティ",
  "状態",
  "枚数",
  "所持ステータス",
  "言語",
  "購入価格",
  "購入日",
  "購入店舗",
  "保管場所",
  "メモ",
  "写真URL",
] as const;

export type CsvRow = Record<string, string>;

export function parseCsv(text: string) {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  const [headers, ...body] = rows;
  if (!headers || headers.length === 0) return [];

  return body
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ""])),
    ) as CsvRow[];
}

export function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export function csvResponse(filename: string, rows: string[][]) {
  return new Response(`\uFEFF${toCsv(rows)}`, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

export function readCsvValue(row: CsvRow, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[alias]?.trim();
    if (value) return value;
  }
  return "";
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      cell = "";
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
