import * as nutritionIAService from "../../services/nutritionIAService/nutritionIA.service.js";

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
