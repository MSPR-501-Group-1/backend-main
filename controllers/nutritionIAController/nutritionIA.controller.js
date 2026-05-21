import * as nutritionIAService from "../../services/nutritionIAService/nutritionIA.service.js";

// GET /nutrition-ia/ingredients/search?name=...&limit=...
export const searchIngredients = async (req, res) => {
    try {
        const { name, limit } = req.query;

        if (!name) {
            return res.status(400).json({ success: false, message: "Paramètre 'name' requis" });
        }

        const data = await nutritionIAService.searchIngredients(name, limit ? Number(limit) : 10);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Erreur searchIngredients:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /nutrition-ia/users/:id/daily-needs
export const getDailyNeeds = async (req, res) => {
    try {
        const data = await nutritionIAService.getDailyNeeds(req.params.id);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Erreur getDailyNeeds:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /nutrition-ia/users/:id/meal-plan?days=...
export const getMealPlan = async (req, res) => {
    try {
        const days = req.query.days ? Number(req.query.days) : 7;
        const data = await nutritionIAService.getMealPlan(req.params.id, days);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Erreur getMealPlan:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /nutrition-ia/users/:id/analyses?limit=...&skip=...
export const getUserAnalyses = async (req, res) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const skip  = req.query.skip  ? Number(req.query.skip)  : 0;
        const data  = await nutritionIAService.getUserAnalyses(req.params.id, limit, skip);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Erreur getUserAnalyses:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /nutrition-ia/users/:id/analyze-meal  (multipart/form-data, champ "file")
export const analyzeMeal = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Image requise (champ 'file')" });
        }

        const data = await nutritionIAService.analyzeMeal(
            req.params.id,
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname,
        );
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Erreur analyzeMeal:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
