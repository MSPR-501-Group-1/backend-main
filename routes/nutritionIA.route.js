import express from "express";
import multer  from "multer";
import * as controller from "../controllers/nutritionIAController/nutritionIA.controller.js";
import { authenticate, requireOwnerOrAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Stockage en mémoire — le buffer est passé directement au service IA
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Seules les images sont acceptées"));
        }
        cb(null, true);
    },
});

// ─── Ingrédients ───────────────────────────────────────────────────────────────
// Accessible à tout utilisateur connecté
router.get("/ingredients/search", authenticate, controller.searchIngredients);

// ─── Routes par utilisateur (propriétaire ou admin uniquement) ─────────────────
router.get(
    "/users/:id/daily-needs",
    authenticate, requireOwnerOrAdmin,
    controller.getDailyNeeds,
);

router.post(
    "/users/:id/meal-plan",
    authenticate, requireOwnerOrAdmin,
    controller.getMealPlan,
);

router.get(
    "/users/:id/analyses",
    authenticate, requireOwnerOrAdmin,
    controller.getUserAnalyses,
);

router.post(
    "/users/:id/analyze-meal",
    authenticate, requireOwnerOrAdmin,
    upload.single("file"),
    controller.analyzeMeal,
);

export default router;
