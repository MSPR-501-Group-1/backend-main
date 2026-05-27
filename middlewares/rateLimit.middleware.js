import rateLimit from "express-rate-limit";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const workoutPredictionDailyLimit = rateLimit({
    windowMs: ONE_DAY_MS,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.user_id || req.ip,
    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            message: "Limite quotidienne atteinte (5 requêtes par jour)."
        });
    }
});

export default {
    workoutPredictionDailyLimit,
};
