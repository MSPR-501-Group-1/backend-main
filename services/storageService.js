import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

const internalEndpoint = process.env.MINIO_INTERNAL_URL;
const publicEndpoint = process.env.MINIO_PUBLIC_URL;

const s3Client = new S3Client({
    region: 'eu-west-1',
    endpoint: internalEndpoint,
    credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER,
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD,
    },
    forcePathStyle: true,
    // Désactive le checksum CRC32 automatique du SDK v3 pour éviter
    // SignatureDoesNotMatch lors des uploads présignés (Postman/mobile)
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
});

export const getUploadPresignedUrl = async (bucket, key, contentType) => {
    const signingClient = new S3Client({
        region: 'eu-west-1',
        endpoint: publicEndpoint,
        credentials: {
            accessKeyId: process.env.MINIO_ROOT_USER,
            secretAccessKey: process.env.MINIO_ROOT_PASSWORD,
        },
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
