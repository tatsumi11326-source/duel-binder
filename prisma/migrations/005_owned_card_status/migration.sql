ALTER TABLE "OwnedCard" ADD COLUMN "ownershipStatus" TEXT NOT NULL DEFAULT 'OWNED';

CREATE INDEX "OwnedCard_ownershipStatus_idx" ON "OwnedCard"("ownershipStatus");
