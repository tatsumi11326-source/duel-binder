import { normalizeCardSearchText } from "@/lib/card-search";

const entries: Array<[string, string]> = [
  ["ブラックマジシャン", "Dark Magician"],
  ["ブラック・マジシャン", "Dark Magician"],
  ["ブラマジ", "Dark Magician"],
  ["青眼の白龍", "Blue-Eyes White Dragon"],
  ["ブルーアイズホワイトドラゴン", "Blue-Eyes White Dragon"],
  ["ブルーアイズ", "Blue-Eyes White Dragon"],
  ["真紅眼の黒竜", "Red-Eyes Black Dragon"],
  ["レッドアイズブラックドラゴン", "Red-Eyes Black Dragon"],
  ["レッドアイズ", "Red-Eyes Black Dragon"],
  ["クリボー", "Kuriboh"],
  ["ハネクリボー", "Winged Kuriboh"],
  ["カオスソルジャー", "Black Luster Soldier"],
  ["暗黒騎士ガイア", "Gaia The Fierce Knight"],
  ["デーモンの召喚", "Summoned Skull"],
  ["ブラックマジシャンガール", "Dark Magician Girl"],
  ["ブラック・マジシャン・ガール", "Dark Magician Girl"],
  ["エルフの剣士", "Celtic Guardian"],
  ["砦を守る翼竜", "Winged Dragon, Guardian of the Fortress #1"],
  ["ホーリーエルフ", "Mystical Elf"],
  ["死者蘇生", "Monster Reborn"],
  ["強欲な壺", "Pot of Greed"],
  ["サンダーボルト", "Raigeki"],
  ["聖なるバリアミラーフォース", "Mirror Force"],
  ["聖なるバリア－ミラーフォース－", "Mirror Force"],
  ["ハーピィの羽根帚", "Harpie's Feather Duster"],
  ["サイクロン", "Mystical Space Typhoon"],
  ["融合", "Polymerization"],
  ["エクゾディア", "Exodia the Forbidden One"],
  ["封印されしエクゾディア", "Exodia the Forbidden One"],
  ["オベリスクの巨神兵", "Obelisk the Tormentor"],
  ["オシリスの天空竜", "Slifer the Sky Dragon"],
  ["ラーの翼神竜", "The Winged Dragon of Ra"],
];

export const fallbackNameMap: Record<string, string> = Object.fromEntries(
  entries.map(([japaneseName, englishName]) => [normalizeCardSearchText(japaneseName), englishName]),
);

export function findFallbackEnglishName(query: string) {
  return fallbackNameMap[normalizeCardSearchText(query)] ?? null;
}
