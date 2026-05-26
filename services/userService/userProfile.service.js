import { db } from "../../db.js";
import { v4 as uuidv4 } from "uuid";

const METRIC_FIELDS = [
    "recorded_at",
    "birth_date",
    "gender",
    "height_cm",
    "weight_kg",
    "bmi",
    "body_fat_percentage",
    "resting_bpm",
    "health_goal",
    "target_timeline_weeks",
    "fitness_level",
    "fatigue_score",
    "has_gym_access",
    "workout_variety_preference",
    "injury_type",
    "injury_severity",
    "medical_condition",
];

const toProfilePayload = (row) => {
    if (!row) {
        return null;
    }

    return {
        metric_id: row.metric_id,
        user_id: row.user_id,
        recorded_at: row.recorded_at,
        birth_date: row.birth_date,
        gender: row.gender,
        height_cm: row.height_cm,
        weight_kg: row.weight_kg,
        bmi: row.bmi,
        body_fat_percentage: row.body_fat_percentage,
        resting_bpm: row.resting_bpm,
        health_goal: row.health_goal,
        target_timeline_weeks: row.target_timeline_weeks,
        fitness_level: row.fitness_level,
        fatigue_score: row.fatigue_score,
        has_gym_access: row.has_gym_access,
        workout_variety_preference: row.workout_variety_preference,
        injury_type: row.injury_type,
        injury_severity: row.injury_severity,
        medical_condition: row.medical_condition,
    };
};

const findProfileById = async (client, user_id) => {
    const result = await client.query(
        `SELECT
            um.metric_id,
            um.user_id,
            um.recorded_at,
            um.birth_date,
            um.gender,
            um.height_cm,
            um.weight_kg,
            um.bmi,
            um.body_fat_percentage,
            um.resting_bpm,
            um.health_goal,
            um.target_timeline_weeks,
            um.fitness_level,
            um.fatigue_score,
            um.has_gym_access,
            um.workout_variety_preference,
            um.injury_type,
            um.injury_severity,
            um.medical_condition
         FROM user_metrics um
         WHERE um.user_id = $1
         ORDER BY um.recorded_at DESC NULLS LAST, um.metric_id DESC
         LIMIT 1`,
        [user_id]
    );

    return result.rows[0] || null;
};

const getLatestMetricId = async (client, user_id) => {
    const result = await client.query(
        `SELECT metric_id
         FROM user_metrics
         WHERE user_id = $1
         ORDER BY recorded_at DESC NULLS LAST, metric_id DESC
         LIMIT 1`,
        [user_id]
    );

    return result.rows[0]?.metric_id || null;
};

// GET all user profiles
export const getUserProfiles = async () => {
    const result = await db.query(
        `SELECT
            DISTINCT ON (um.user_id)
            um.metric_id,
            um.user_id,
            um.recorded_at,
            um.birth_date,
            um.gender,
            um.height_cm,
            um.weight_kg,
            um.bmi,
            um.body_fat_percentage,
            um.resting_bpm,
            um.health_goal,
            um.target_timeline_weeks,
            um.fitness_level,
            um.fatigue_score,
            um.has_gym_access,
            um.workout_variety_preference,
            um.injury_type,
            um.injury_severity,
            um.medical_condition
         FROM user_metrics um
         ORDER BY um.user_id, um.recorded_at DESC NULLS LAST, um.metric_id DESC`
    );

    return result.rows.map(toProfilePayload);
};

// GET a single user profile by user_id
export const getUserProfileById = async (user_id) => {
    const client = await db.connect();

    try {
        const row = await findProfileById(client, user_id);
        return toProfilePayload(row);
    } finally {
        client.release();
    }
};

// POST initialize a user profile for a given user_id
export const createUserProfile = async (user_id, data = {}) => {
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const existingUser = await client.query(
            "SELECT user_id FROM user_ WHERE user_id = $1",
            [user_id]
        );

        if (existingUser.rows.length === 0) {
            throw new Error("USER_NOT_FOUND");
        }

        const metricId = data.metric_id || uuidv4();
        const recordedAt = data.recorded_at || new Date().toISOString().split("T")[0];

        const insertValues = [
            metricId,
            user_id,
            recordedAt,
            data.birth_date ?? null,
            data.gender ?? null,
            data.height_cm ?? null,
            data.weight_kg ?? null,
            data.bmi ?? null,
            data.body_fat_percentage ?? null,
            data.resting_bpm ?? null,
            data.health_goal ?? null,
            data.target_timeline_weeks ?? null,
            data.fitness_level ?? null,
            data.fatigue_score ?? null,
            data.has_gym_access ?? null,
            data.workout_variety_preference ?? null,
            data.injury_type ?? null,
            data.injury_severity ?? null,
            data.medical_condition ?? null,
        ];

        const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(", ");

        const insertResult = await client.query(
            `INSERT INTO user_metrics (
                metric_id,
                user_id,
                recorded_at,
                birth_date,
                gender,
                height_cm,
                weight_kg,
                bmi,
                body_fat_percentage,
                resting_bpm,
                health_goal,
                target_timeline_weeks,
                fitness_level,
                fatigue_score,
                has_gym_access,
                workout_variety_preference,
                injury_type,
                injury_severity,
                medical_condition
            ) VALUES (${placeholders})
            RETURNING *`,
            insertValues
        );

        const row = insertResult.rows[0];

        await client.query("COMMIT");
        return toProfilePayload(row);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

// PUT update a user profile by user_id
export const updateUserProfile = async (user_id, data) => {
    const hasMetricField = METRIC_FIELDS.some((field) => data[field] !== undefined);

    if (!hasMetricField) {
        throw new Error("NO_FIELDS_TO_UPDATE");
    }

    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const existingUser = await client.query(
            "SELECT user_id FROM user_ WHERE user_id = $1",
            [user_id]
        );

        if (existingUser.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        const metricId = await getLatestMetricId(client, user_id);

        if (!metricId) {
            await client.query("ROLLBACK");
            return null;
        }

        const updates = [];
        const params = [];
        let paramIndex = 1;

        for (const field of METRIC_FIELDS) {
            if (data[field] !== undefined) {
                updates.push(`${field} = $${paramIndex++}`);
                params.push(data[field]);
            }
        }

        params.push(metricId);

        const updateResult = await client.query(
            `UPDATE user_metrics
             SET ${updates.join(", ")}
             WHERE metric_id = $${paramIndex}
             RETURNING *`,
            params
        );

        const row = updateResult.rows[0] || null;

        await client.query("COMMIT");
        return toProfilePayload(row);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

// DELETE reset profile fields and remove goals for a user
export const deleteUserProfile = async (user_id) => {
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const existingUser = await client.query(
            "SELECT user_id FROM user_ WHERE user_id = $1",
            [user_id]
        );

        if (existingUser.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        const existingMetric = await client.query(
            "SELECT metric_id FROM user_metrics WHERE user_id = $1 LIMIT 1",
            [user_id]
        );

        if (existingMetric.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        await client.query("DELETE FROM user_metrics WHERE user_id = $1", [user_id]);

        await client.query("COMMIT");
        return { user_id };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};