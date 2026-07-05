-- CreateTable
CREATE TABLE "Binder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BinderSlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "binderId" INTEGER NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "pocketNumber" INTEGER NOT NULL,
    "ownedCardId" INTEGER,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BinderSlot_binderId_fkey" FOREIGN KEY ("binderId") REFERENCES "Binder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BinderSlot_ownedCardId_fkey" FOREIGN KEY ("ownedCardId") REFERENCES "OwnedCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Binder_name_idx" ON "Binder"("name");
CREATE UNIQUE INDEX "BinderSlot_binderId_pageNumber_pocketNumber_key" ON "BinderSlot"("binderId", "pageNumber", "pocketNumber");
CREATE INDEX "BinderSlot_binderId_idx" ON "BinderSlot"("binderId");
CREATE INDEX "BinderSlot_ownedCardId_idx" ON "BinderSlot"("ownedCardId");
CREATE INDEX "BinderSlot_pageNumber_idx" ON "BinderSlot"("pageNumber");
