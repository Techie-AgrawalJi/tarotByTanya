import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

function hasCloudinaryCredentials(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function ensureCloudinaryConfigured(): void {
  if (isConfigured || !hasCloudinaryCredentials()) {
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  isConfigured = true;
}

export function isCloudinaryReady(): boolean {
  return hasCloudinaryCredentials();
}

export async function getLatestClientPhotoUrl(): Promise<string | null> {
  if (!hasCloudinaryCredentials()) {
    return null;
  }

  ensureCloudinaryConfigured();

  const tag = process.env.CLOUDINARY_CLIENT_PHOTO_TAG ?? "client-photo";

  const result = await cloudinary.search
    .expression(`resource_type:image AND tags:${tag}`)
    .sort_by("created_at", "desc")
    .max_results(1)
    .execute();

  const latest = result.resources?.[0];

  return typeof latest?.secure_url === "string" ? latest.secure_url : null;
}