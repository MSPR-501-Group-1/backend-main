import { db } from "../../db.js";
import { v4 as uuidv4 } from "uuid";

// GET - Récupère les 100 derniers posts du flux social
export const getPosts = async () => {
  const result = await db.query(`
    SELECT
      sp.post_id,
      sp.text,
      sp.media_url,
      sp.media_type,
      sp.created_at,
      u.user_id,
      COALESCE(u.display_name, u.first_name || ' ' || u.last_name) AS display_name,
      u.avatar_url
    FROM social_post sp
    JOIN user_ u ON sp.user_id = u.user_id
    WHERE u.is_active = true
    ORDER BY sp.created_at DESC
    LIMIT 100
  `);
  return result.rows;
};

// POST - Crée un nouveau post
export const createPost = async (user_id, { text, media_url, media_type }) => {
  if (!text && !media_url) throw new Error("POST_EMPTY");

  const post_id = uuidv4();
  const result = await db.query(
    `INSERT INTO social_post (post_id, user_id, text, media_url, media_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [post_id, user_id, text || null, media_url || null, media_type || null]
  );
  return result.rows[0];
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
