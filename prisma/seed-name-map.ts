import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type SourceNameMap = {
  jp_name?: string;
  en_name?: string;
  japaneseName?: string;
  englishName?: string;
};

const prisma = new PrismaClient();
const chunkSize = 500;

async function main() {
  const filePath = path.join(process.cwd(), "prisma", "name_map.json");
  const rows = JSON.parse(await readFile(filePath, "utf8")) as SourceNameMap[];
  const maps = uniqueMaps(rows);
  const existingMaps = await prisma.nameMap.findMany({
    select: {
      englishName: true,
      japaneseName: true,
    },
  });
  const existingKeys = new Set(existingMaps.map((map) => mapKey(map.japaneseName, map.englishName)));
  const missingMaps = maps.filter((map) => !existingKeys.has(mapKey(map.japaneseName, map.englishName)));

  for (let index = 0; index < missingMaps.length; index += chunkSize) {
    const chunk = missingMaps.slice(index, index + chunkSize);
    await prisma.nameMap.createMany({ data: chunk });
  }

  console.log(`Seeded ${missingMaps.length} Japanese card name maps. Total source rows: ${maps.length}.`);
}

function uniqueMaps(rows: SourceNameMap[]) {
  const seen = new Set<string>();
  const maps: Array<{ japaneseName: string; englishName: string; searchText: string }> = [];

  for (const row of rows) {
    const japaneseName = (row.jp_name ?? row.japaneseName ?? "").trim();
    const englishName = (row.en_name ?? row.englishName ?? "").trim();
    if (!japaneseName || !englishName) continue;

    const key = mapKey(japaneseName, englishName);
    if (seen.has(key)) continue;
    seen.add(key);

    maps.push({
      japaneseName,
      englishName,
      searchText: normalizeSearchText(`${japaneseName} ${englishName}`),
    });
  }

  return maps;
}

function mapKey(japaneseName: string, englishName: string) {
  return `${japaneseName}\u0000${englishName}`;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[・･\s　\-‐-‒–—―＿_.,，、。'’"“”/／\\()[\]{}【】「」『』:：;；!！?？+＋]/g, "")
    .replace(/ヴ/g, "ウ")
    .trim();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
