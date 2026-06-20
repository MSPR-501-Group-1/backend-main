import { db } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { getUploadPresignedUrl } from '../services/storageService.js';
import { processVideo } from '../services/transcodingService.js';

const BUCKET_RAW = process.env.MINIO_BUCKET_RAW || 'raw-uploads';
const BUCKET_PROD = process.env.MINIO_BUCKET_PROD || 'production-medias';

export const requestUpload = async (req, res) => {
    try {
        // Validation basique
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
        const extension = contentType === 'video/mp4' ? 'mp4' : 'mov';
        const rawKey = `uploads/${mediaId}.${extension}`;

        // Obtenir l'URL pré-signée
        const presignedUrl = await getUploadPresignedUrl(BUCKET_RAW, rawKey, contentType || 'video/mp4');

        // Créer l'entrée en BDD (status PENDING)
        await db.query(`
            INSERT INTO social_post_media (media_id, post_id, media_type, process_status, raw_object_key)
            VALUES ($1, $2, 'video', 'PENDING', $3)
        `, [mediaId, postId, rawKey]);

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
        const { mediaId } = req.body;
        if (!mediaId) {
            return res.status(400).json({ error: 'mediaId is required' });
        }

        const result = await db.query('SELECT raw_object_key, process_status FROM social_post_media WHERE media_id = $1', [mediaId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Media not found' });
        }

        const media = result.rows[0];
        if (media.process_status !== 'PENDING') {
            return res.status(400).json({ error: 'Upload is already confirmed or processed' });
        }

        // Passer le statut à PROCESSING
        await db.query('UPDATE social_post_media SET process_status = $1 WHERE media_id = $2', ['PROCESSING', mediaId]);

        // Déclencher le traitement asynchrone (fire and forget pour ne pas bloquer la réponse)
        processVideo(mediaId, media.raw_object_key, BUCKET_RAW, BUCKET_PROD);

        res.status(200).json({
            message: 'Upload confirmed, processing started',
            mediaId
        });

    } catch (error) {
        console.error('Error in confirmUpload:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
