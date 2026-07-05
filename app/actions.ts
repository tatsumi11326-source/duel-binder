"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppSettings, saveAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { findImportCardCandidate } from "@/lib/card-import-lookup";
import { normalizeCardNumber } from "@/lib/card-number";
import { parseCsv, readCsvValue } from "@/lib/csv";
import { findDuplicateOwnedCards } from "@/lib/duplicate-owned-cards";
import { dateValue, intValue, requiredString, stringValue } from "@/lib/form";
import { saveOwnedCardPhoto } from "@/lib/photo-storage";

export async function createCard(formData: FormData) {
  const card = await prisma.card.create({
    data: cardData(formData),
  });
  await upsertCardPrintFromValues({
    cardId: card.id,
    cardNumber: card.cardNumber,
    imageUrl: card.imageUrl,
    language: "日本語",
    packName: card.packName,
    rarity: card.rarity,
    source: "card-master",
  });
  revalidatePath("/cards");
  redirect("/cards");
}

export async function updateCard(id: number, formData: FormData) {
  const card = await prisma.card.update({
    where: { id },
    data: cardData(formData),
  });
  await upsertCardPrintFromValues({
    cardId: card.id,
    cardNumber: card.cardNumber,
    imageUrl: card.imageUrl,
    language: "日本語",
    packName: card.packName,
    rarity: card.rarity,
    source: "card-master",
  });
  revalidatePath("/cards");
  revalidatePath(`/cards/${id}`);
  redirect("/cards");
}

export async function deleteCard(id: number) {
  await prisma.card.delete({ where: { id } });
  revalidatePath("/cards");
  revalidatePath("/collection");
  redirect("/cards");
}

export async function createOwnedCard(formData: FormData) {
  const ownedCard = await prisma.ownedCard.create({
    data: await ownedCardData(formData),
    include: { card: true },
  });
  await upsertCardPrintFromValues({
    cardId: ownedCard.cardId,
    cardNumber: ownedCard.cardNumber,
    imageUrl: ownedCard.photoUrl ?? ownedCard.card.imageUrl,
    language: ownedCard.language,
    packName: ownedCard.card.packName,
    rarity: ownedCard.rarity ?? ownedCard.card.rarity,
    source: "owned-card",
  });
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/binders");
  redirect("/collection");
}

export async function importSearchCandidateToCollection(formData: FormData) {
  const japaneseName = requiredString(formData, "japaneseName");
  const englishName = stringValue(formData, "englishName");
  const cardNumber = normalizedStringValue(formData, "cardNumber");
  const packName = stringValue(formData, "packName");
  const rarity = stringValue(formData, "rarity");
  const imageUrl = stringValue(formData, "imageUrl");
  const [uploadedPhotoUrl, settings] = await Promise.all([saveOwnedCardPhoto(formData), getAppSettings()]);

  let card = await prisma.card.findFirst({
    where: {
      OR: [
        {
          japaneseName,
          cardNumber,
        },
        {
          englishName,
          cardNumber,
        },
      ],
    },
  });

  if (!card) {
    card = await prisma.card.create({
      data: {
        japaneseName,
        englishName,
        cardNumber,
        packName,
        rarity,
        cardType: stringValue(formData, "cardType"),
        attribute: stringValue(formData, "attribute"),
        race: stringValue(formData, "race"),
        level: intValue(formData, "level"),
        atk: intValue(formData, "atk"),
        def: intValue(formData, "def"),
        description: stringValue(formData, "description"),
        imageUrl,
        notes: stringValue(formData, "source") ? `source: ${stringValue(formData, "source")}` : null,
      },
    });
  }

  await prisma.ownedCard.create({
    data: {
      cardId: card.id,
      quantity: intValue(formData, "quantity") ?? settings.defaultQuantity,
      ownershipStatus: stringValue(formData, "ownershipStatus") ?? settings.defaultOwnershipStatus,
      condition: stringValue(formData, "condition") ?? settings.defaultCondition,
      rarity,
      cardNumber,
      language: stringValue(formData, "language") ?? settings.defaultLanguage,
      storage: stringValue(formData, "storage") ?? (settings.defaultStorage || null),
      memo: stringValue(formData, "memo"),
      photoUrl: uploadedPhotoUrl ?? imageUrl,
    },
  });
  await upsertCardPrintFromValues({
    cardId: card.id,
    cardNumber,
    imageUrl,
    language: stringValue(formData, "language") ?? "日本語",
    packName,
    rarity,
    source: stringValue(formData, "source") ?? "search-import",
  });

  revalidatePath("/");
  revalidatePath("/cards");
  revalidatePath("/collection");
  revalidatePath("/binders");
  redirect("/collection");
}

export async function updateOwnedCard(id: number, formData: FormData) {
  const returnTo = safeReturnTo(stringValue(formData, "returnTo"));
  const ownedCard = await prisma.ownedCard.update({
    where: { id },
    data: await ownedCardData(formData),
    include: { card: true },
  });
  await upsertCardPrintFromValues({
    cardId: ownedCard.cardId,
    cardNumber: ownedCard.cardNumber,
    imageUrl: ownedCard.photoUrl ?? ownedCard.card.imageUrl,
    language: ownedCard.language,
    packName: ownedCard.card.packName,
    rarity: ownedCard.rarity ?? ownedCard.card.rarity,
    source: "owned-card",
  });
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/binders");
  redirect(returnTo);
}

export async function refreshOwnedCardImageFromYgoProDeck(id: number, returnTo: string, _formData: FormData) {
  const destination = safeReturnTo(returnTo);
  const ownedCard = await prisma.ownedCard.findUnique({
    where: { id },
    include: { card: true },
  });

  if (!ownedCard) {
    redirect(`${destination}${destination.includes("?") ? "&" : "?"}imageRefresh=not-found`);
  }

  const candidate = await findImportCardCandidate(ownedCard.card.japaneseName, ownedCard.card.englishName);
  if (!candidate?.imageUrl) {
    redirect(`${destination}${destination.includes("?") ? "&" : "?"}imageRefresh=not-found`);
  }

  await prisma.$transaction([
    prisma.card.update({
      where: { id: ownedCard.cardId },
      data: {
        cardType: ownedCard.card.cardType ?? candidate.cardType,
        attribute: ownedCard.card.attribute ?? candidate.attribute,
        race: ownedCard.card.race ?? candidate.race,
        level: ownedCard.card.level ?? candidate.level,
        atk: ownedCard.card.atk ?? candidate.atk,
        def: ownedCard.card.def ?? candidate.def,
        description: ownedCard.card.description ?? candidate.description,
        englishName: ownedCard.card.englishName ?? candidate.englishName,
        imageUrl: candidate.imageUrl,
        packName: ownedCard.card.packName ?? candidate.packName,
      },
    }),
    prisma.ownedCard.update({
      where: { id },
      data: {
        photoUrl: candidate.imageUrl,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/cards");
  revalidatePath("/collection");
  revalidatePath("/binders");
  redirect(`${destination}${destination.includes("?") ? "&" : "?"}imageRefresh=updated`);
}

export async function deleteOwnedCard(id: number) {
  await prisma.ownedCard.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/binders");
  redirect("/collection");
}

export async function deleteOwnedCards(formData: FormData) {
  const ids = formData
    .getAll("ownedCardIds")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (ids.length === 0) {
    redirect("/collection?bulkDelete=none");
  }

  await prisma.ownedCard.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/binders");
  redirect(`/collection?bulkDeleted=${ids.length}`);
}

export async function createWishlistItem(formData: FormData) {
  await prisma.wishlistItem.create({
    data: wishlistData(formData),
  });
  revalidatePath("/");
  revalidatePath("/wishlist");
  redirect("/wishlist");
}

export async function updateWishlistItem(id: number, formData: FormData) {
  await prisma.wishlistItem.update({
    where: { id },
    data: wishlistData(formData),
  });
  revalidatePath("/");
  revalidatePath("/wishlist");
  redirect("/wishlist");
}

export async function toggleWishlistPurchased(id: number, purchased: boolean) {
  await prisma.wishlistItem.update({
    where: { id },
    data: { purchased },
  });
  revalidatePath("/");
  revalidatePath("/wishlist");
}

export async function deleteWishlistItem(id: number) {
  await prisma.wishlistItem.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/wishlist");
}

export async function createBinder(formData: FormData) {
  const binder = await prisma.binder.create({
    data: {
      name: requiredString(formData, "name"),
      description: stringValue(formData, "description"),
      color: stringValue(formData, "color") ?? "#d19a1d",
    },
  });
  revalidatePath("/binders");
  revalidatePath(`/binders/${binder.id}`);
  redirect(`/binders/${binder.id}`);
}

export async function deleteBinder(id: number) {
  await prisma.binder.delete({ where: { id } });
  revalidatePath("/binders");
  revalidatePath(`/binders/${id}`);
  redirect("/binders");
}

export async function addBinderPage(binderId: number, currentMaxPage: number, mode: "view" | "manage") {
  const nextPage = currentMaxPage + 1;
  await prisma.binder.update({
    where: { id: binderId },
    data: {
      pageCount: {
        set: nextPage,
      },
    },
  });
  revalidatePath("/binders");
  revalidatePath(`/binders/${binderId}`);
  redirect(`/binders/${binderId}?page=${nextPage}&mode=${mode}`);
}

export async function addOwnedCardToBinder(binderId: number, currentPage: number, formData: FormData) {
  const ownedCardId = intValue(formData, "ownedCardId");
  const pageNumber = intValue(formData, "pageNumber") ?? currentPage;
  const pocketNumber = intValue(formData, "pocketNumber");
  const memo = stringValue(formData, "memo");

  if (!ownedCardId) throw new Error("ownedCardId is required");
  if (!pocketNumber || pocketNumber < 1 || pocketNumber > 9) throw new Error("pocketNumber must be between 1 and 9");

  const binder = await prisma.binder.findUnique({
    where: { id: binderId },
    select: { pageCount: true },
  });
  const nextPageCount = Math.max(binder?.pageCount ?? 1, pageNumber);

  await prisma.$transaction([
    prisma.binder.update({
      where: { id: binderId },
      data: {
        pageCount: {
          set: nextPageCount,
        },
      },
    }),
    prisma.binderSlot.upsert({
      where: {
        binderId_pageNumber_pocketNumber: {
          binderId,
          pageNumber,
          pocketNumber,
        },
      },
      update: {
        ownedCardId,
        memo,
      },
      create: {
        binderId,
        pageNumber,
        pocketNumber,
        ownedCardId,
        memo,
      },
    }),
  ]);

  revalidatePath("/binders");
  revalidatePath(`/binders/${binderId}`);
  redirect(`/binders/${binderId}?page=${pageNumber}&mode=manage`);
}

export async function addOwnedCardToBinderEnd(binderId: number, formData: FormData) {
  const ownedCardId = intValue(formData, "ownedCardId");
  if (!ownedCardId) throw new Error("ownedCardId is required");

  const binder = await prisma.binder.findUnique({
    where: { id: binderId },
    include: {
      slots: {
        where: {
          ownedCardId: {
            not: null,
          },
        },
        orderBy: [{ pageNumber: "desc" }, { pocketNumber: "desc" }],
        take: 1,
      },
    },
  });

  if (!binder) throw new Error("binder not found");

  const lastSlot = binder.slots[0];
  const pageNumber = lastSlot ? lastSlot.pageNumber + (lastSlot.pocketNumber >= 9 ? 1 : 0) : 1;
  const pocketNumber = lastSlot ? (lastSlot.pocketNumber >= 9 ? 1 : lastSlot.pocketNumber + 1) : 1;
  const nextPageCount = Math.max(binder.pageCount, pageNumber);

  await prisma.$transaction([
    prisma.binder.update({
      where: { id: binderId },
      data: {
        pageCount: {
          set: nextPageCount,
        },
      },
    }),
    prisma.binderSlot.upsert({
      where: {
        binderId_pageNumber_pocketNumber: {
          binderId,
          pageNumber,
          pocketNumber,
        },
      },
      update: {
        ownedCardId,
      },
      create: {
        binderId,
        pageNumber,
        pocketNumber,
        ownedCardId,
      },
    }),
  ]);

  revalidatePath("/binders");
  revalidatePath(`/binders/${binderId}`);
  redirect(`/binders/${binderId}?page=${pageNumber}&mode=manage`);
}

export async function reorderBinderPageSlots(
  binderId: number,
  pageNumber: number,
  fromPocket: number,
  toPocket: number,
  operation: "swap" | "insert",
) {
  await reorderBinderPageSlotsCore(binderId, pageNumber, fromPocket, toPocket, operation);
}

export async function reorderBinderPageSlotsFromForm(binderId: number, pageNumber: number, formData: FormData) {
  const fromPocket = intValue(formData, "fromPocket");
  const toPocket = intValue(formData, "toPocket");
  const operation = formData.get("operation") === "insert" ? "insert" : "swap";

  if (!fromPocket || !toPocket) {
    throw new Error("fromPocket and toPocket are required");
  }

  await reorderBinderPageSlotsCore(binderId, pageNumber, fromPocket, toPocket, operation);
}

async function reorderBinderPageSlotsCore(
  binderId: number,
  pageNumber: number,
  fromPocket: number,
  toPocket: number,
  operation: "swap" | "insert",
) {
  if (fromPocket < 1 || fromPocket > 9 || toPocket < 1 || toPocket > 9) {
    throw new Error("pocket number must be between 1 and 9");
  }

  if (fromPocket === toPocket) {
    redirect(`/binders/${binderId}?page=${pageNumber}&mode=manage`);
  }

  const slots = await prisma.binderSlot.findMany({
    where: { binderId, pageNumber },
    orderBy: { pocketNumber: "asc" },
  });

  const pocketItems = Array.from({ length: 9 }, (_, index) => {
    const slot = slots.find((item) => item.pocketNumber === index + 1);
    return {
      ownedCardId: slot?.ownedCardId ?? null,
      memo: slot?.memo ?? null,
    };
  });

  const fromIndex = fromPocket - 1;
  const toIndex = toPocket - 1;

  if (!pocketItems[fromIndex].ownedCardId) {
    redirect(`/binders/${binderId}?page=${pageNumber}&mode=manage`);
  }

  if (operation === "swap") {
    const source = pocketItems[fromIndex];
    pocketItems[fromIndex] = pocketItems[toIndex];
    pocketItems[toIndex] = source;
  } else {
    const [source] = pocketItems.splice(fromIndex, 1);
    const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    pocketItems.splice(insertIndex, 0, source);
  }

  await prisma.$transaction([
    prisma.binderSlot.deleteMany({
      where: { binderId, pageNumber },
    }),
    ...pocketItems.flatMap((item, index) =>
      item.ownedCardId
        ? [
            prisma.binderSlot.create({
              data: {
                binderId,
                pageNumber,
                pocketNumber: index + 1,
                ownedCardId: item.ownedCardId,
                memo: item.memo,
              },
            }),
          ]
        : [],
    ),
  ]);

  revalidatePath("/binders");
  revalidatePath(`/binders/${binderId}`);
  redirect(`/binders/${binderId}?page=${pageNumber}&mode=manage`);
}

export async function assignBinderSlot(binderId: number, pageNumber: number, pocketNumber: number, formData: FormData) {
  const ownedCardId = intValue(formData, "ownedCardId");
  const memo = stringValue(formData, "memo");

  if (!ownedCardId) {
    await prisma.binderSlot.deleteMany({
      where: { binderId, pageNumber, pocketNumber },
    });
  } else {
    await prisma.binderSlot.upsert({
      where: {
        binderId_pageNumber_pocketNumber: {
          binderId,
          pageNumber,
          pocketNumber,
        },
      },
      update: {
        ownedCardId,
        memo,
      },
      create: {
        binderId,
        pageNumber,
        pocketNumber,
        ownedCardId,
        memo,
      },
    });
  }

  revalidatePath("/binders");
  revalidatePath(`/binders/${binderId}`);
  redirect(`/binders/${binderId}?page=${pageNumber}&mode=manage`);
}

export async function clearBinderSlot(binderId: number, pageNumber: number, pocketNumber: number) {
  await prisma.binderSlot.deleteMany({
    where: { binderId, pageNumber, pocketNumber },
  });
  revalidatePath("/binders");
  revalidatePath(`/binders/${binderId}`);
  redirect(`/binders/${binderId}?page=${pageNumber}&mode=manage`);
}

export async function clearExpiredExternalCardCache() {
  await prisma.externalCardCache.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  revalidatePath("/settings");
  redirect("/settings?cache=expired-cleared");
}

export async function clearAllExternalCardCache() {
  await prisma.externalCardCache.deleteMany();
  revalidatePath("/settings");
  redirect("/settings?cache=all-cleared");
}

export async function clearCsvImportLock() {
  await prisma.appSetting.delete({ where: { key: "csvImportLock" } }).catch(() => undefined);
  revalidatePath("/settings");
  redirect("/settings?importLock=cleared");
}

export async function updateAppSettings(formData: FormData) {
  await saveAppSettings({
    defaultCondition: stringValue(formData, "defaultCondition") ?? "A",
    defaultLanguage: stringValue(formData, "defaultLanguage") ?? "日本語",
    defaultOwnershipStatus: stringValue(formData, "defaultOwnershipStatus") ?? "OWNED",
    defaultQuantity: intValue(formData, "defaultQuantity") ?? 1,
    defaultStorage: stringValue(formData, "defaultStorage") ?? "",
    unownedBinderDisplay: formData.get("unownedBinderDisplay") === "hidden" ? "hidden" : "grayscale",
  });
  revalidatePath("/settings");
  revalidatePath("/binders");
  revalidatePath("/collection/new");
  redirect("/settings?settings=saved");
}

export async function importCollectionCsv(formData: FormData) {
  const file = formData.get("csvFile");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/settings?importError=${encodeURIComponent("CSVファイルを選択してください")}`);
  }

  const importLock = await acquireCsvImportLock();
  if (!importLock.acquired) {
    redirect(`/settings?importError=${encodeURIComponent("CSVインポートがすでに実行中です。完了するまで待ってください。")}`);
  }

  try {
  const rows = parseCsv(await file.text());
  const settings = await getAppSettings();
  let imported = 0;
  let skipped = 0;
  let duplicateWarnings = 0;
  const candidateCache = new Map<string, Awaited<ReturnType<typeof findImportCardCandidate>>>();

  for (const row of rows) {
    const japaneseName = readCsvValue(row, ["カード名", "cardName", "japaneseName", "name"]);
    const englishName = nullableCsvValue(row, ["英語名", "englishName"]);
    if (!japaneseName && !englishName) {
      skipped += 1;
      continue;
    }

    const displayName = japaneseName || englishName || "名称未設定";
    const candidateKey = `${displayName}|${englishName ?? ""}`;
    let candidate = candidateCache.get(candidateKey);
    if (!candidateCache.has(candidateKey)) {
      candidate = await findImportCardCandidate(displayName, englishName);
      candidateCache.set(candidateKey, candidate);
    }

    const cardNumber = normalizeCardNumber(readCsvValue(row, ["型番", "cardNumber"]));
    const rarity = nullableCsvValue(row, ["レアリティ", "rarity"]);
    const language = nullableCsvValue(row, ["言語", "language"]) ?? settings.defaultLanguage;
    const imageUrl = nullableCsvValue(row, ["写真URL", "photoUrl", "imageUrl"]) ?? candidate?.imageUrl ?? null;
    const packName = nullableCsvValue(row, ["パック名", "packName"]) ?? candidate?.packName ?? null;

    let card = await prisma.card.findFirst({
      where: {
        OR: [
          { japaneseName: displayName },
          ...(englishName || candidate?.englishName ? [{ englishName: englishName ?? candidate?.englishName ?? undefined }] : []),
        ],
      },
    });

    if (!card) {
      card = await prisma.card.create({
        data: {
          japaneseName: displayName,
          englishName: englishName ?? candidate?.englishName ?? null,
          cardNumber: cardNumber || null,
          packName,
          rarity,
          cardType: candidate?.cardType ?? null,
          attribute: candidate?.attribute ?? null,
          race: candidate?.race ?? null,
          level: candidate?.level ?? null,
          atk: candidate?.atk ?? null,
          def: candidate?.def ?? null,
          description: candidate?.description ?? null,
          imageUrl,
          notes: candidate ? "source: csv-import auto lookup" : "source: csv-import",
        },
      });
    } else if (!card.imageUrl && imageUrl) {
      card = await prisma.card.update({
        where: { id: card.id },
        data: {
          englishName: card.englishName ?? englishName ?? candidate?.englishName ?? null,
          packName: card.packName ?? packName,
          cardType: card.cardType ?? candidate?.cardType ?? null,
          attribute: card.attribute ?? candidate?.attribute ?? null,
          race: card.race ?? candidate?.race ?? null,
          level: card.level ?? candidate?.level ?? null,
          atk: card.atk ?? candidate?.atk ?? null,
          def: card.def ?? candidate?.def ?? null,
          description: card.description ?? candidate?.description ?? null,
          imageUrl,
        },
      });
    }

    const duplicateMatches = await findDuplicateOwnedCards({
      cardId: card.id,
      cardNumber,
      englishName: card.englishName,
      japaneseName: card.japaneseName,
      language,
      rarity,
    });
    if (duplicateMatches.length > 0) duplicateWarnings += 1;

    await prisma.ownedCard.create({
      data: {
        cardId: card.id,
        quantity: parseCsvInt(readCsvValue(row, ["枚数", "quantity"])) ?? settings.defaultQuantity,
        ownershipStatus: nullableCsvValue(row, ["所持ステータス", "ownershipStatus"]) ?? settings.defaultOwnershipStatus,
        condition: nullableCsvValue(row, ["状態", "condition"]) ?? settings.defaultCondition,
        rarity,
        cardNumber: cardNumber || null,
        language,
        purchasePrice: parseCsvInt(readCsvValue(row, ["購入価格", "purchasePrice"])),
        purchaseDate: parseCsvDate(readCsvValue(row, ["購入日", "purchaseDate"])),
        purchaseShop: nullableCsvValue(row, ["購入店舗", "purchaseShop"]),
        storage: nullableCsvValue(row, ["保管場所", "storage"]) ?? (settings.defaultStorage || null),
        memo: nullableCsvValue(row, ["メモ", "memo"]),
        photoUrl: imageUrl,
      },
    });

    await upsertCardPrintFromValues({
      cardId: card.id,
      cardNumber,
      imageUrl,
      language,
      packName,
      rarity,
      source: candidate ? "csv-import-auto-lookup" : "csv-import",
    });

    imported += 1;
  }

  revalidatePath("/");
  revalidatePath("/cards");
  revalidatePath("/collection");
  revalidatePath("/settings");
  redirect(`/settings?imported=${imported}&skipped=${skipped}&duplicates=${duplicateWarnings}`);
  } finally {
    await releaseCsvImportLock(importLock.token);
  }
}

async function acquireCsvImportLock() {
  const key = "csvImportLock";
  const token = crypto.randomUUID();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 30 * 60 * 1000);
  const existingLock = await prisma.appSetting.findUnique({ where: { key } });

  if (existingLock && existingLock.updatedAt < staleBefore) {
    await prisma.appSetting.delete({ where: { key } }).catch(() => undefined);
  }

  try {
    await prisma.appSetting.create({
      data: {
        key,
        value: JSON.stringify({ startedAt: now.toISOString(), token }),
      },
    });
    return { acquired: true as const, token };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { acquired: false as const, token: null };
    }
    throw error;
  }
}

async function releaseCsvImportLock(token: string | null) {
  if (!token) return;
  const key = "csvImportLock";
  const lock = await prisma.appSetting.findUnique({ where: { key } });
  if (!lock) return;

  try {
    const value = JSON.parse(lock.value) as { token?: string };
    if (value.token !== token) return;
  } catch {
    return;
  }

  await prisma.appSetting.delete({ where: { key } }).catch(() => undefined);
}

async function upsertCardPrintFromValues({
  cardId,
  cardNumber,
  imageUrl,
  language,
  packName,
  rarity,
  source,
}: {
  cardId: number;
  cardNumber?: string | null;
  imageUrl?: string | null;
  language?: string | null;
  packName?: string | null;
  rarity?: string | null;
  source: string;
}) {
  const normalizedCardNumber = normalizeCardNumber(cardNumber);
  if (!normalizedCardNumber) return;
  const normalizedRarity = rarity ?? "";
  const normalizedLanguage = language ?? "日本語";

  await prisma.cardPrint.upsert({
    where: {
      cardId_cardNumber_rarity_language: {
        cardId,
        cardNumber: normalizedCardNumber,
        rarity: normalizedRarity,
        language: normalizedLanguage,
      },
    },
    update: {
      imageUrl,
      packName,
      source,
    },
    create: {
      cardId,
      cardNumber: normalizedCardNumber,
      imageUrl,
      language: normalizedLanguage,
      packName,
      rarity: normalizedRarity,
      source,
    },
  });
}

function cardData(formData: FormData) {
  return {
    japaneseName: requiredString(formData, "japaneseName"),
    englishName: stringValue(formData, "englishName"),
    cardNumber: normalizedStringValue(formData, "cardNumber"),
    packName: stringValue(formData, "packName"),
    rarity: stringValue(formData, "rarity"),
    cardType: stringValue(formData, "cardType"),
    attribute: stringValue(formData, "attribute"),
    race: stringValue(formData, "race"),
    level: intValue(formData, "level"),
    atk: intValue(formData, "atk"),
    def: intValue(formData, "def"),
    description: stringValue(formData, "description"),
    imageUrl: stringValue(formData, "imageUrl"),
    notes: stringValue(formData, "notes"),
  };
}

async function ownedCardData(formData: FormData) {
  const cardId = intValue(formData, "cardId");
  if (!cardId) throw new Error("cardId is required");
  const [uploadedPhotoUrl, settings] = await Promise.all([saveOwnedCardPhoto(formData), getAppSettings()]);

  return {
    cardId,
    quantity: intValue(formData, "quantity") ?? settings.defaultQuantity,
    ownershipStatus: stringValue(formData, "ownershipStatus") ?? settings.defaultOwnershipStatus,
    condition: stringValue(formData, "condition") ?? settings.defaultCondition,
    rarity: stringValue(formData, "rarity"),
    cardNumber: normalizedStringValue(formData, "cardNumber"),
    language: stringValue(formData, "language") ?? settings.defaultLanguage,
    purchasePrice: intValue(formData, "purchasePrice"),
    purchaseDate: dateValue(formData, "purchaseDate"),
    purchaseShop: stringValue(formData, "purchaseShop"),
    storage: stringValue(formData, "storage") ?? (settings.defaultStorage || null),
    memo: stringValue(formData, "memo"),
    photoUrl: uploadedPhotoUrl ?? stringValue(formData, "photoUrl"),
  };
}

function wishlistData(formData: FormData) {
  return {
    cardName: requiredString(formData, "cardName"),
    cardNumber: normalizedStringValue(formData, "cardNumber"),
    desiredRarity: stringValue(formData, "desiredRarity"),
    desiredCondition: stringValue(formData, "desiredCondition"),
    budget: intValue(formData, "budget"),
    priority: stringValue(formData, "priority") ?? "中",
    memo: stringValue(formData, "memo"),
    purchased: formData.get("purchased") === "on",
  };
}

function safeReturnTo(value?: string | null) {
  if (!value) return "/collection";
  if (!value.startsWith("/") || value.startsWith("//")) return "/collection";
  return value;
}

function normalizedStringValue(formData: FormData, key: string) {
  const normalized = normalizeCardNumber(stringValue(formData, key));
  return normalized || null;
}

function nullableCsvValue(row: Record<string, string>, aliases: string[]) {
  const value = readCsvValue(row, aliases);
  return value || null;
}

function parseCsvInt(value: string) {
  const normalized = value.normalize("NFKC").replace(/[,，円¥￥\s]/g, "");
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvDate(value: string) {
  if (!value) return null;
  const normalized = value.normalize("NFKC").replace(/[./]/g, "-");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
