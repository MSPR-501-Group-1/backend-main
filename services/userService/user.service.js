import { db } from "../../db.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const SALT_ROUNDS = 10;

// GET all users
export const getUsers = async () => {
    const query = `
        SELECT u.user_id, u.email, u.first_name, u.last_name, u.display_name, u.avatar_url, u.birth_date, u.gender_code, r.role_type, u.created_at, u.is_active
        FROM user_ u
        LEFT JOIN role r ON u.role_id = r.role_id
        WHERE 1=1
    `;

    const result = await db.query(query);
    return result.rows;
};

// GET a single user by id
export const getUserById = async (id) => {
    const query = `
        SELECT u.user_id, u.email, u.first_name, u.last_name, u.display_name, u.avatar_url, u.birth_date, u.gender_code, r.role_type, u.created_at, u.is_active
        FROM user_ u
        LEFT JOIN role r ON u.role_id = r.role_id
        WHERE u.user_id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0] || null;
};

// POST a new user
export const createUser = async (data) => {
    const { email, password, first_name, last_name, birth_date, gender_code, role_type, is_active } = data;

    if (!password) {
        throw new Error("PASSWORD_REQUIRED");
    }

    // Vérification si l'email existe déjà
    const existingUser = await db.query(
        "SELECT user_id FROM user_ WHERE email = $1",
        [email]
    );

    if (existingUser.rows.length > 0) {
        throw new Error("EMAIL_EXISTS");
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user_id = uuidv4();

    // Resolve role_type -> role_id (fallback to FREEMIUM)
    const roleType = role_type || 'FREEMIUM';
    const roleRes = await db.query("SELECT role_id FROM role WHERE role_type = $1 LIMIT 1", [roleType]);
    const role_id = roleRes.rows[0]?.role_id ?? 'ROLE_01';

    const result = await db.query(
        `INSERT INTO user_ (user_id, email, password_hash, first_name, last_name, birth_date, gender_code, role_id, created_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
         RETURNING user_id, email, first_name, last_name, birth_date, gender_code, created_at, is_active, role_id`,
        [
            user_id,
            email,
            password_hash,
            first_name,
            last_name,
            birth_date || null,
            gender_code || null,
            role_id,
            is_active !== false,
        ]
    );

    // Return with role_type for compatibility
    const created = result.rows[0];
    const roleInfo = await db.query("SELECT role_type FROM role WHERE role_id = $1", [created.role_id]);
    return {
        ...created,
        role_type: roleInfo.rows[0]?.role_type ?? roleType,
    };
};

// PUT a user by id
export const updateUser = async (id, data) => {
    // Allow updating role via role_type (converted to role_id) or directly role_id
    if (data.role_type) {
        const roleRes = await db.query("SELECT role_id FROM role WHERE role_type = $1 LIMIT 1", [data.role_type]);
        data.role_id = roleRes.rows[0]?.role_id ?? data.role_id;
        delete data.role_type;
    }

    const allowedFields = ["email", "first_name", "last_name", "display_name", "avatar_url", "birth_date", "gender_code", "role_id", "is_active"];
    const updates = [];
    const params = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            updates.push(`${field} = $${paramIndex++}`);
            params.push(data[field]);
        }
    }

    if (updates.length === 0) {
        throw new Error("NO_FIELDS_TO_UPDATE");
    }

    // Vérification de la disponibilité du nouvel email
    if (data.email) {
        const existingUser = await db.query(
            "SELECT user_id FROM user_ WHERE email = $1 AND user_id != $2",
            [data.email, id]
        );
        if (existingUser.rows.length > 0) {
            throw new Error("EMAIL_EXISTS");
        }
    }

    params.push(id);

    const result = await db.query(
        `UPDATE user_ SET ${updates.join(", ")} WHERE user_id = $${paramIndex}
         RETURNING user_id`,
        params
    );

    if (!result.rows[0]) {
        return null;
    }

    return getUserById(id);
};

// Mise à jour dynamique PATCH (Single Responsibility pour l'écriture SQL du profil)
export const updateSocialProfile = async (id, data) => {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (data.display_name !== undefined) {
        updates.push(`display_name = $${paramIndex}`);
        params.push(data.display_name);
        paramIndex++;
    }

    if (data.avatar_url !== undefined) {
        updates.push(`avatar_url = $${paramIndex}`);
        params.push(data.avatar_url);
        paramIndex++;
    }

    // Si aucun paramètre n'a été modifié, on retourne simplement l'état actuel de l'utilisateur
    if (updates.length === 0) {
        return getUserById(id);
    }

    params.push(id);

    await db.query(
        `UPDATE user_ 
         SET ${updates.join(", ")}, updated_at = NOW() 
         WHERE user_id = $${paramIndex}`,
        params
    );

    return getUserById(id);
};

// Désactivation d'un utilisateur (soft delete)
export const softDeleteUser = async (id) => {
    const result = await db.query(
        "UPDATE user_ SET is_active = false WHERE user_id = $1 RETURNING user_id",
        [id]
    );
    return result.rows[0] || null;
};

// Mise à jour de l'avatar (URL MinIO)
export const updateAvatarUrl = async (id, avatar_url) => {
    const result = await db.query(
        "UPDATE user_ SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id",
        [avatar_url, id]
    );
    if (!result.rows[0]) throw new Error("USER_NOT_FOUND");
    return true;
};

// Suppression définitive d'un utilisateur (hard delete)
export const hardDeleteUser = async (id) => {
    const result = await db.query(
        "DELETE FROM user_ WHERE user_id = $1 RETURNING user_id",
        [id]
    );
    return result.rows[0] || null;
};