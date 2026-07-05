import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cards = [
    {
      japaneseName: "ブラック・マジシャン",
      englishName: "Dark Magician",
      cardNumber: "LB-05",
      packName: "Vol.1",
      rarity: "ウルトラレア",
      cardType: "通常モンスター",
      attribute: "闇",
      race: "魔法使い族",
      level: 7,
      atk: 2500,
      def: 2100,
      description: "魔法使いとしては、攻撃力・守備力ともに最高クラス。",
      notes: "初期カード管理用のサンプルです。",
    },
    {
      japaneseName: "青眼の白龍",
      englishName: "Blue-Eyes White Dragon",
      cardNumber: "LB-01",
      packName: "青眼の白龍伝説",
      rarity: "ウルトラレア",
      cardType: "通常モンスター",
      attribute: "光",
      race: "ドラゴン族",
      level: 8,
      atk: 3000,
      def: 2500,
      description: "高い攻撃力を誇る伝説のドラゴン。",
    },
  ];

  for (const card of cards) {
    await prisma.card.upsert({
      where: { id: card.cardNumber === "LB-05" ? 1 : 2 },
      update: card,
      create: card,
    });
  }

  const maps = [
    {
      id: 1,
      japaneseName: "ブラック・マジシャン",
      englishName: "Dark Magician",
      kana: "ぶらっくまじしゃん",
      alias: "ブラマジ",
      cardNumber: "LB-05",
    },
    {
      id: 2,
      japaneseName: "青眼の白龍",
      englishName: "Blue-Eyes White Dragon",
      kana: "ぶるーあいずほわいとどらごん",
      alias: "ブルーアイズ",
      cardNumber: "LB-01",
    },
  ];

  for (const map of maps) {
    await prisma.nameMap.upsert({
      where: { id: map.id },
      update: map,
      create: map,
    });
  }
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
