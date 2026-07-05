-- CreateTable
CREATE TABLE "Card" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "japaneseName" TEXT NOT NULL,
    "englishName" TEXT,
    "cardNumber" TEXT,
    "packName" TEXT,
    "rarity" TEXT,
    "cardType" TEXT,
    "attribute" TEXT,
    "race" TEXT,
    "level" INTEGER,
    "atk" INTEGER,
    "def" INTEGER,
    "description" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NameMap" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "japaneseName" TEXT NOT NULL,
    "englishName" TEXT NOT NULL,
    "kana" TEXT,
    "alias" TEXT,
    "cardNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OwnedCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cardId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT NOT NULL DEFAULT 'A',
    "rarity" TEXT,
    "cardNumber" TEXT,
    "language" TEXT NOT NULL DEFAULT '日本語',
    "purchasePrice" INTEGER,
    "purchaseDate" DATETIME,
    "purchaseShop" TEXT,
    "storage" TEXT,
    "memo" TEXT,
    "photoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OwnedCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cardName" TEXT NOT NULL,
    "cardNumber" TEXT,
    "desiredRarity" TEXT,
    "desiredCondition" TEXT,
    "budget" INTEGER,
    "priority" TEXT NOT NULL DEFAULT '中',
    "memo" TEXT,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Card_japaneseName_idx" ON "Card"("japaneseName");
CREATE INDEX "Card_englishName_idx" ON "Card"("englishName");
CREATE INDEX "Card_cardNumber_idx" ON "Card"("cardNumber");
CREATE INDEX "Card_packName_idx" ON "Card"("packName");
CREATE INDEX "Card_rarity_idx" ON "Card"("rarity");
CREATE INDEX "Card_cardType_idx" ON "Card"("cardType");
CREATE INDEX "NameMap_japaneseName_idx" ON "NameMap"("japaneseName");
CREATE INDEX "NameMap_englishName_idx" ON "NameMap"("englishName");
CREATE INDEX "NameMap_kana_idx" ON "NameMap"("kana");
CREATE INDEX "NameMap_alias_idx" ON "NameMap"("alias");
CREATE INDEX "NameMap_cardNumber_idx" ON "NameMap"("cardNumber");
CREATE INDEX "OwnedCard_cardId_idx" ON "OwnedCard"("cardId");
CREATE INDEX "OwnedCard_condition_idx" ON "OwnedCard"("condition");
CREATE INDEX "OwnedCard_rarity_idx" ON "OwnedCard"("rarity");
CREATE INDEX "OwnedCard_cardNumber_idx" ON "OwnedCard"("cardNumber");
CREATE INDEX "OwnedCard_storage_idx" ON "OwnedCard"("storage");
CREATE INDEX "WishlistItem_cardName_idx" ON "WishlistItem"("cardName");
CREATE INDEX "WishlistItem_cardNumber_idx" ON "WishlistItem"("cardNumber");
CREATE INDEX "WishlistItem_priority_idx" ON "WishlistItem"("priority");
CREATE INDEX "WishlistItem_purchased_idx" ON "WishlistItem"("purchased");
