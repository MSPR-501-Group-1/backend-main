import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { db } from '../db.js';
import { getObjectStream, uploadFile, getPublicUrl } from './storageService.js';
import { pipeline } from 'stream/promises';

const TEMP_DIR = path.join(process.cwd(), 'tmp');

export const processVideo = async (mediaId, rawKey, bucketRaw, bucketProd) => {
    try {
        console.log(`[Transcoding] Starting process for media: ${mediaId}`);
        await fs.mkdir(TEMP_DIR, { recursive: true });
        const mediaTempDir = path.join(TEMP_DIR, mediaId);
        await fs.mkdir(mediaTempDir, { recursive: true });

        const rawFilePath = path.join(mediaTempDir, 'raw.mp4');
        const hlsOutputDir = path.join(mediaTempDir, 'hls');
        await fs.mkdir(hlsOutputDir, { recursive: true });

        // 1. Download raw file from MinIO
        console.log(`[Transcoding] Downloading raw file: ${rawKey}`);
        const s3Stream = await getObjectStream(bucketRaw, rawKey);
        await pipeline(s3Stream, createWriteStream(rawFilePath));

        // 2. Transcode to HLS using fluent-ffmpeg
        console.log(`[Transcoding] Transcoding to HLS...`);
        const hlsPlaylistPath = path.join(hlsOutputDir, 'playlist.m3u8');
        
        await new Promise((resolve, reject) => {
            ffmpeg(rawFilePath)
                .outputOptions([
                    '-profile:v baseline', // Profile compatible
                    '-level 3.0',
                    '-start_number 0',     // Start index for segments
                    '-hls_time 10',        // Segment duration 10s
                    '-hls_list_size 0',    // Keep all segments in playlist
                    '-f hls'
                ])
                .output(hlsPlaylistPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        // 3. Upload all HLS files (m3u8 + ts) to production bucket
        console.log(`[Transcoding] Uploading HLS segments to ${bucketProd}...`);
        const files = await fs.readdir(hlsOutputDir);
        for (const file of files) {
            const filePath = path.join(hlsOutputDir, file);
            const destKey = `videos/${mediaId}/${file}`;
            const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
            await uploadFile(bucketProd, destKey, filePath, contentType);
        }

        // 4. Update Database
        const publicPlaylistUrl = getPublicUrl(bucketProd, `videos/${mediaId}/playlist.m3u8`);
        console.log(`[Transcoding] Updating DB status to READY. URL: ${publicPlaylistUrl}`);
        
        await db.query(`
            UPDATE social_post_media 
            SET process_status = 'READY', media_url = $1 
            WHERE media_id = $2
        `, [publicPlaylistUrl, mediaId]);

        // Cleanup
        await fs.rm(mediaTempDir, { recursive: true, force: true });
        console.log(`[Transcoding] Done for ${mediaId}`);
    } catch (error) {
        console.error(`[Transcoding] Error processing media ${mediaId}:`, error);
        // Mark as FAILED in DB
        try {
            await db.query(`
                UPDATE social_post_media 
                SET process_status = 'FAILED' 
                WHERE media_id = $1
            `, [mediaId]);
        } catch (dbError) {
            console.error(`[Transcoding] Failed to update DB to FAILED for ${mediaId}:`, dbError);
        }
    }
};
