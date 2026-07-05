CREATE TABLE "CardPrint" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cardId" INTEGER NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "packName" TEXT,
    "rarity" TEXT,
    "language" TEXT NOT NULL DEFAULT '日本語',
    "imageUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardPrint_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CardPrint_cardId_cardNumber_rarity_language_key" ON "CardPrint"("cardId", "cardNumber", "rarity", "language");
CREATE INDEX "CardPrint_cardId_idx" ON "CardPrint"("cardId");
CREATE INDEX "CardPrint_cardNumber_idx" ON "CardPrint"("cardNumber");
CREATE INDEX "CardPrint_packName_idx" ON "CardPrint"("packName");
CREATE INDEX "CardPrint_rarity_idx" ON "CardPrint"("rarity");
CREATE INDEX "CardPrint_language_idx" ON "CardPrint"("language");

INSERT OR IGNORE INTO "CardPrint" ("cardId", "cardNumber", "packName", "rarity", "language", "imageUrl", "source", "createdAt", "updatedAt")
SELECT "id", "cardNumber", "packName", "rarity", '日本語', "imageUrl", 'card-master', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Card"
WHERE "cardNumber" IS NOT NULL AND TRIM("cardNumber") <> '';

INSERT OR IGNORE INTO "CardPrint" ("cardId", "cardNumber", "packName", "rarity", "language", "imageUrl", "source", "createdAt", "updatedAt")
SELECT oc."cardId", oc."cardNumber", c."packName", oc."rarity", oc."language", COALESCE(oc."photoUrl", c."imageUrl"), 'owned-card', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "OwnedCard" oc
JOIN "Card" c ON c."id" = oc."cardId"
WHERE oc."cardNumber" IS NOT NULL AND TRIM(oc."cardNumber") <> '';
