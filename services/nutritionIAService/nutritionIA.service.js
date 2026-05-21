// Service proxy vers le micro-service ia-nutrition-recommendation (FastAPI)
// En docker : http://ia-nutrition-recommendation:8000
// En local  : http://localhost:8000 (via IA_NUTRITION_URL dans .env)

const DEFAULT_IA_URL = "http://ia-nutrition-recommendation:8000";

const getIaUrl = () => {
    const raw = String(process.env.IA_NUTRITION_URL || "").trim();
    return raw || DEFAULT_IA_URL;
};

/**
 * Appelle le service IA et retourne le JSON.
 * Lève une erreur explicite en cas d'échec HTTP.
 */
const callIa = async (path, options = {}) => {
    const response = await fetch(`${getIaUrl()}${path}`, options);

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`IA service (${response.status}): ${body || response.statusText}`);
    }

    return response.json();
};

// ─── Recherche d'ingrédients ───────────────────────────────────────────────────

export const searchIngredients = async (name, limit = 10) => {
    const qs = new URLSearchParams({ name, limit: String(limit) });
    return callIa(`/api/v1/ingredients/search?${qs}`);
};

// ─── Besoins journaliers ───────────────────────────────────────────────────────

export const getDailyNeeds = async (userId) => {
    return callIa(`/api/v1/users/${encodeURIComponent(userId)}/daily-needs`);
};

// ─── Plan de repas (génération Ollama) ────────────────────────────────────────

export const getMealPlan = async (userId, days = 7) => {
    return callIa(
        `/api/v1/users/${encodeURIComponent(userId)}/meal-plan?days=${days}`,
        { method: "POST" },
    );
};

// ─── Historique des analyses ───────────────────────────────────────────────────

export const getUserAnalyses = async (userId, limit = 20, skip = 0) => {
    const qs = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    return callIa(`/api/v1/users/${encodeURIComponent(userId)}/analyses?${qs}`);
};

// ─── Analyse de repas par photo (multipart → proxy vers IA) ───────────────────

export const analyzeMeal = async (userId, fileBuffer, mimeType, filename) => {
    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer], { type: mimeType }), filename);

    return callIa(
        `/api/v1/users/${encodeURIComponent(userId)}/analyze-meal`,
        { method: "POST", body: formData },
    );
};
