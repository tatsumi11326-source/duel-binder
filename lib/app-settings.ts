import { prisma } from "@/lib/prisma";

export type UnownedBinderDisplay = "hidden" | "grayscale";

export type AppSettings = {
  defaultCondition: string;
  defaultLanguage: string;
  defaultOwnershipStatus: string;
  defaultQuantity: number;
  defaultStorage: string;
  unownedBinderDisplay: UnownedBinderDisplay;
};

export const defaultAppSettings: AppSettings = {
  defaultCondition: "A",
  defaultLanguage: "日本語",
  defaultOwnershipStatus: "OWNED",
  defaultQuantity: 1,
  defaultStorage: "",
  unownedBinderDisplay: "grayscale",
};

export async function getAppSettings(): Promise<AppSettings> {
  const rows = await prisma.appSetting.findMany();
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    defaultCondition: values.defaultCondition || defaultAppSettings.defaultCondition,
    defaultLanguage: values.defaultLanguage || defaultAppSettings.defaultLanguage,
    defaultOwnershipStatus: values.defaultOwnershipStatus || defaultAppSettings.defaultOwnershipStatus,
    defaultQuantity: parsePositiveInt(values.defaultQuantity, defaultAppSettings.defaultQuantity),
    defaultStorage: values.defaultStorage ?? defaultAppSettings.defaultStorage,
    unownedBinderDisplay: values.unownedBinderDisplay === "hidden" ? "hidden" : "grayscale",
  };
}

export async function saveAppSettings(settings: Partial<AppSettings>) {
  const entries = Object.entries(settings).map(([key, value]) =>
    prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value ?? "") },
      create: { key, value: String(value ?? "") },
    }),
  );

  if (entries.length > 0) await prisma.$transaction(entries);
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
