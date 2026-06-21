import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configuration unifiée et rétrocompatible des variables d'environnement
const internalEndpoint = process.env.MINIO_INTERNAL_URL;
const publicEndpoint = process.env.MINIO_PUBLIC_URL;
const appEndpoint = process.env.MINIO_APP_URL;

const accessKeyId = process.env.MINIO_ROOT_USER;
const secretAccessKey = process.env.MINIO_ROOT_PASSWORD;
const DEFAULT_BUCKET = process.env.MINIO_BUCKET_PROD;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
};

// Client principal pour les échanges internes au réseau Docker
const s3Client = new S3Client({
  region: 'eu-west-1',
  endpoint: internalEndpoint,
  credentials: { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

/**
 * RESPONSABILITÉ 1 : Génération d'URLs de dépôt pré-signées (Pour Postman / Upload direct)
 */
export const generateUploadPresignedUrl = async (bucket, key, contentType) => {
  // Utilisation d'un client dédié basé sur l'URL publique pour éviter les rejets de signature à l'externe
  const signingClient = new S3Client({
    region: 'eu-west-1',
    endpoint: publicEndpoint,
    credentials: { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(signingClient, command, { expiresIn: 3600 });
};

/**
 * RESPONSABILITÉ 2 : Upload direct de Buffers mémoire (Pour l'application mobile / Avatars via Multer)
 */
export const uploadFileBuffer = async (fileBuffer, mimeType, folder = "uploads", bucket = DEFAULT_BUCKET) => {
  const ext = MIME_TO_EXT[mimeType];
  if (!ext) throw new Error("UNSUPPORTED_FILE_TYPE");

  const key = `${folder}/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Retourne l'URL formatée pour l'application mobile (IP Émulateur 10.0.2.2)
  return `${appEndpoint}/${bucket}/${key}`;
};

/**
 * RESPONSABILITÉ 3 : Upload depuis un chemin fichier local (Pour le pipeline de Transcodage)
 */
export const uploadFileFromPath = async (bucket, key, filePath, contentType) => {
  const fileStream = fs.createReadStream(filePath);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
  });
  return await s3Client.send(command);
};

/**
 * RESPONSABILITÉ 4 : Récupération de flux de fichiers (Pour la lecture / pipelines)
 */
export const getObjectStream = async (bucket, key) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const response = await s3Client.send(command);
  return response.Body;
};

/**
 * RESPONSABILITÉ 5 : Construction d'URLs publiques standardisées (Pour le stockage en BDD général)
 */
export const getPublicUrl = (bucket, key) => {
  return `${publicEndpoint}/${bucket}/${key}`;
};
