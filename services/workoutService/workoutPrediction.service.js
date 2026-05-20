import { db } from "../../db.js";

const DEFAULT_IA_WORKOUT_API_URL = "http://ia-workout-recommendation:8001";

const getIaWorkoutApiUrl = () => {
    const rawUrl = String(process.env.IA_WORKOUT_API_URL || "").trim();
    return rawUrl || DEFAULT_IA_WORKOUT_API_URL;
};

const callIaWorkoutApi = async (path, payload) => {
    const response = await fetch(`${getIaWorkoutApiUrl()}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`IA workout API call failed (${response.status}): ${errorBody || response.statusText}`);
    }

    return response.json();
};

const getLatestUserMetrics = async (userId) => {
    const result = await db.query(
        `SELECT *
         FROM user_metrics
         WHERE user_id = $1
         ORDER BY recorded_at DESC NULLS LAST
         LIMIT 1`,
        [userId]
    );

    return result.rows[0] || null;
};

const buildPredictionPayload = (metricsRow, fatigueScore) => {
    if (!metricsRow) return null;

    const {
        metric_id,
        user_id,
        recorded_at,
        recorded_date,
        fatigue_score,
        ...rest
    } = metricsRow;

    return {
        ...rest,
        fatigue_score: fatigueScore ?? fatigue_score,
    };
};

export const predictWorkoutPlan = async ({ userId, fatigueScore }) => {
    const metrics = await getLatestUserMetrics(userId);

    if (!metrics) {
        throw new Error("Aucune métrique trouvée pour cet utilisateur.");
    }

    const payload = buildPredictionPayload(metrics, fatigueScore);

    if (!payload) {
        throw new Error("Impossible de construire le payload de prédiction.");
    }

    const prediction = await callIaWorkoutApi("/predict", payload);

    return prediction?.recommended_plan ?? prediction?.recommendedPlan ?? null;
};
