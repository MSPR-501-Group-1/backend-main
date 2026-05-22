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

        if (fatigueScore === undefined || fatigueScore === null || Number.isNaN(Number(fatigueScore)) || fatigueScore > 10 || fatigueScore < 1) {
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
            ...plan,
        });
    } catch (error) {
        console.error("Erreur predictWorkoutPlan:", error.message);

        if (error.message === "NO_METRICS_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Aucune métrique trouvée pour cet utilisateur. Veuillez compléter votre profil."
            });
        }

        if (error.message?.startsWith("IA_API_UNAVAILABLE")) {
            return res.status(503).json({
                success: false,
                message: "Le service de recommandation est temporairement indisponible."
            });
        }

        if (error.message?.startsWith("IA_API_VALIDATION")) {
            return res.status(422).json({
                success: false,
                message: "Données de profil insuffisantes pour générer une recommandation."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la prédiction du plan d'entraînement"
        });
    }
};
