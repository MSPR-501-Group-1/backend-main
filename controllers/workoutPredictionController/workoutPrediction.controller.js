import * as workoutPredictionService from "../../services/workoutService/workoutPrediction.service.js";

export const predictWorkoutPlan = async (req, res) => {
    try {
        const userId = req.user?.user_id;
        const { fatigueScore } = req.body || {};

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Utilisateur non authentifié"
            });
        }

        if (fatigueScore > 10 || fatigueScore < 1 || fatigueScore === undefined || fatigueScore === null || Number.isNaN(Number(fatigueScore))) {
            return res.status(400).json({
                success: false,
                message: "fatigueScore est requis et doit être un nombre entre 1 et 10"
            });
        }

        const plan = await workoutPredictionService.predictWorkoutPlan({
            userId,
            fatigueScore: Number(fatigueScore)
        });

        return res.status(200).json({
            success: true,
            plan
        });
    } catch (error) {
        console.error("Erreur predictWorkoutPlan:", error);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la prédiction du plan d'entraînement"
        });
    }
};
