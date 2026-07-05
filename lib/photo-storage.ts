import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const maxImageSize = 8 * 1024 * 1024;

export async function saveOwnedCardPhoto(formData: FormData) {
  const file = formData.get("photoFile");
  if (!(file instanceof File) || file.size === 0) return null;
  validateImageFile(file);

  const provider = imageStorageProvider();
  if (provider === "cloudinary") return uploadToCloudinary(file);
  if (provider === "url-only") {
    throw new Error("公開環境では画像ファイルを直接保存できません。写真URLを入力するか、Cloudinary設定を追加してください。");
  }

  return saveToLocalPublicUploads(file);
}

function imageStorageProvider() {
  const provider = process.env.IMAGE_STORAGE_PROVIDER?.toLowerCase();
  if (provider === "cloudinary" || provider === "local" || provider === "url-only") return provider;
  return process.env.VERCEL ? "url-only" : "local";
}

function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("画像ファイルを選択してください");
  if (file.size > maxImageSize) throw new Error("画像ファイルは8MB以下にしてください");
}

async function saveToLocalPublicUploads(file: File) {
  const extension = imageExtension(file.type);
  const directory = path.join(process.cwd(), "public", "uploads", "owned-cards");
  const filename = `${new Date().toISOString().slice(0, 10)}-${randomUUID()}${extension}`;
  const filePath = path.join(directory, filename);
  const arrayBuffer = await file.arrayBuffer();

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, Buffer.from(arrayBuffer));

  return `/uploads/owned-cards/${filename}`;
}

async function uploadToCloudinary(file: File) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinaryにアップロードするには CLOUDINARY_CLOUD_NAME と CLOUDINARY_UPLOAD_PRESET が必要です。");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  body.append("folder", process.env.CLOUDINARY_FOLDER ?? "duel-binder/owned-cards");

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new Error("Cloudinaryへの画像アップロードに失敗しました。");
  }

  const result = (await response.json()) as { secure_url?: string };
  if (!result.secure_url) throw new Error("Cloudinaryのアップロード結果に画像URLがありません。");

  return result.secure_url;
}

function imageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".img";
}
