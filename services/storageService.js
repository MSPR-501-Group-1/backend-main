import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

const internalEndpoint = `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`;
const publicEndpoint = (process.env.MINIO_PUBLIC_URL || 'http://localhost:9000').replace(/\/$/, '');

const s3Client = new S3Client({
    region: 'eu-west-1',
    endpoint: internalEndpoint,
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
    // Désactive le checksum CRC32 automatique du SDK v3 pour éviter
    // SignatureDoesNotMatch lors des uploads présignés (Postman/mobile)
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
});

export const getUploadPresignedUrl = async (bucket, key, contentType) => {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
    });
    let url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    // Remplace l'endpoint interne docker par l'url publique pour que l'app mobile puisse y accéder
    return url.replace(internalEndpoint, publicEndpoint);
};

export const getObjectStream = async (bucket, key) => {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    const response = await s3Client.send(command);
    return response.Body;
};

export const uploadFile = async (bucket, key, filePath, contentType) => {
    const fileStream = fs.createReadStream(filePath);
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
    });
    return await s3Client.send(command);
};

export const getPublicUrl = (bucket, key) => {
    return `${publicEndpoint}/${bucket}/${key}`;
};
