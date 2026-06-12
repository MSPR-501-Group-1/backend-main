import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const ENDPOINT  = process.env.MINIO_ENDPOINT   || "minio";
const PORT      = process.env.MINIO_PORT        || "9000";
const USE_SSL   = process.env.MINIO_USE_SSL     === "true";
const BUCKET    = process.env.MINIO_BUCKET      || "healthai-media";

// URL publique utilisée dans les media_url stockées en base (accessible hors Docker)
const PUBLIC_URL = process.env.MINIO_PUBLIC_URL || `http://localhost:${PORT}`;

const s3 = new S3Client({
  endpoint: `http${USE_SSL ? "s" : ""}://${ENDPOINT}:${PORT}`,
  region: "us-east-1", // ignoré par MinIO, mais requis par le SDK
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  },
  forcePathStyle: true, // obligatoire pour MinIO
});

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png":  ".png",
  "image/gif":  ".gif",
  "image/webp": ".webp",
  "video/mp4":  ".mp4",
  "video/quicktime": ".mov",
};

/**
 * Upload un fichier dans MinIO.
 * @param {Buffer} fileBuffer  Contenu du fichier
 * @param {string} mimeType    MIME type (ex: "image/jpeg")
 * @param {string} folder      Dossier cible dans le bucket (ex: "posts", "avatars")
 * @returns {Promise<string>}  URL publique du fichier uploadé
 */
export const uploadFile = async (fileBuffer, mimeType, folder = "uploads") => {
  const ext = MIME_TO_EXT[mimeType];
  if (!ext) throw new Error("UNSUPPORTED_FILE_TYPE");

  const key = `${folder}/${uuidv4()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  }));

  return `${PUBLIC_URL}/${BUCKET}/${key}`;
};

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const ALLOWED_MEDIA_TYPES  = [...ALLOWED_IMAGE_TYPES, "video/mp4", "video/quicktime"];
