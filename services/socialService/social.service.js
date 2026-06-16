import { db } from "../../db.js";
import { v4 as uuidv4 } from "uuid";

// GET - Récupère les 100 derniers posts du flux social
export const getPosts = async () => {
  const result = await db.query(`
    SELECT
      sp.post_id,
      sp.text,
      sp.created_at,
      u.user_id,
      COALESCE(u.display_name, u.first_name || ' ' || u.last_name) AS display_name,
      u.avatar_url,
      COALESCE(
        json_agg(
          json_build_object(
            'media_id',      spm.media_id,
            'media_url',     spm.media_url,
            'media_type',    spm.media_type,
            'thumbnail_url', spm.thumbnail_url
          )
        ) FILTER (WHERE spm.media_id IS NOT NULL),
        '[]'::json
      ) AS media
    FROM social_post sp
    JOIN user_ u ON sp.user_id = u.user_id
    LEFT JOIN social_post_media spm ON sp.post_id = spm.post_id
    WHERE u.is_active = true
    GROUP BY sp.post_id, u.user_id
    ORDER BY sp.created_at DESC
    LIMIT 100
  `);
  return result.rows;
};

// POST - Crée un nouveau post
export const createPost = async (user_id, { text, mediaFiles }) => {
  if (!text && (!mediaFiles || mediaFiles.length === 0)) throw new Error("POST_EMPTY");

  const post_id = uuidv4();
  const postResult = await db.query(
    `INSERT INTO social_post (post_id, user_id, text)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [post_id, user_id, text || null]
  );

  const mediaRows = [];
  for (const { media_url, media_type } of mediaFiles ?? []) {
    const mediaResult = await db.query(
      `INSERT INTO social_post_media (media_id, post_id, media_url, media_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [uuidv4(), post_id, media_url, media_type]
    );
    mediaRows.push(mediaResult.rows[0]);
  }

  return { ...postResult.rows[0], media: mediaRows };
};

// DELETE - Supprime un post (propriétaire ou admin uniquement)
export const deletePost = async (post_id, user_id, role_type) => {
  const check = await db.query(
    "SELECT user_id FROM social_post WHERE post_id = $1",
    [post_id]
  );
  if (check.rows.length === 0) throw new Error("POST_NOT_FOUND");
  if (check.rows[0].user_id !== user_id && role_type !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  await db.query("DELETE FROM social_post WHERE post_id = $1", [post_id]);
  return true;
};
