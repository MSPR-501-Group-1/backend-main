import express from "express";
import * as controller from "../controllers/workoutPredictionController/workoutPrediction.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { workoutPredictionDailyLimit } from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

router.post("/predict", authenticate, workoutPredictionDailyLimit, controller.predictWorkoutPlan);

export default router;
