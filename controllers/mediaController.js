import { db } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { generateUploadPresignedUrl, getPublicUrl, copyObject, deleteObject } from '../services/storageService/storage.service.js';
import { processVideo } from '../services/transcodingService/transcoding.service.js';

export const requestUpload = async (req, res) => {
    try {
        const BUCKET_RAW = process.env.MINIO_BUCKET_RAW;

        const { postId, contentType } = req.body;
        if (!postId) {
            return res.status(400).json({ error: 'postId is required' });
        }

        // Vérification de l'existence du post
        const postCheck = await db.query('SELECT post_id FROM social_post WHERE post_id = $1', [postId]);
        if (postCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const mediaId = uuidv4();
        const isImage = contentType && contentType.startsWith('image/');
        const mediaType = isImage ? 'image' : 'video';

        let extension = 'mp4';
        if (isImage) {
            extension = contentType.split('/')[1] || 'jpg';
        } else if (contentType === 'video/quicktime') {
            extension = 'mov';
        }

        const rawKey = `uploads/${mediaId}.${extension}`;
        const requestHost = req.headers.host || '';
        let minioEndpointForClient = process.env.MINIO_PUBLIC_URL;

        if (requestHost.includes('10.0.2.2')) {
            minioEndpointForClient = process.env.MINIO_APP_URL;
        }

        const presignedUrl = await generateUploadPresignedUrl(
            BUCKET_RAW,
            rawKey,
            contentType || 'video/mp4',
            minioEndpointForClient
        );

        await db.query(`
            INSERT INTO social_post_media (media_id, post_id, media_type, process_status, raw_object_key)
            VALUES ($1, $2, $3, 'PENDING', $4)
        `, [mediaId, postId, mediaType, rawKey]);

        res.status(200).json({
            mediaId,
            uploadUrl: presignedUrl,
            rawKey
        });

    } catch (error) {
        console.error('Error in requestUpload:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const confirmUpload = async (req, res) => {
    try {
        const BUCKET_RAW = process.env.MINIO_BUCKET_RAW;
        const BUCKET_PROD = process.env.MINIO_BUCKET_PROD;

        const { mediaId } = req.body;
        if (!mediaId) {
            return res.status(400).json({ error: 'mediaId is required' });
        }

        const result = await db.query('SELECT raw_object_key, process_status, media_type FROM social_post_media WHERE media_id = $1', [mediaId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Media not found' });

        const media = result.rows[0];
        if (media.process_status !== 'PENDING') {
            return res.status(400).json({ error: 'Upload is already confirmed or processed' });
        }

        if (media.media_type === 'video') {
            await db.query('UPDATE social_post_media SET process_status = $1 WHERE media_id = $2', ['PROCESSING', mediaId]);
            processVideo(mediaId, media.raw_object_key, BUCKET_RAW, BUCKET_PROD);
            res.status(200).json({ message: 'Upload confirmed, video processing started', mediaId });
        } else {
            const destKey = media.raw_object_key; // On conserve le même chemin (ex: uploads/abc-123.jpeg)

            await copyObject(BUCKET_RAW, media.raw_object_key, BUCKET_PROD, destKey);

            await deleteObject(BUCKET_RAW, media.raw_object_key);

            const publicUrl = getPublicUrl(BUCKET_PROD, destKey);

            await db.query('UPDATE social_post_media SET process_status = $1, media_url = $2 WHERE media_id = $3', ['READY', publicUrl, mediaId]);

            res.status(200).json({ message: 'Upload confirmed, image copied to production', mediaId, url: publicUrl });
        }
    } catch (error) {
        console.error('Error in confirmUpload:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
