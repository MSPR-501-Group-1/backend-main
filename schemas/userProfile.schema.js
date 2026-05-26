import { z } from "zod";

// Matches enums in database/01_initdb.sql
const genderEnum = z.enum(["Male", "Female"], { message: "Genre invalide" });

const fitnessLevelEnum = z.enum(["beginner", "intermediate", "advanced"], {
    message: "Niveau de fitness invalide",
});

const injuryTypeEnum = z.enum(["none", "back", "knee", "ankle", "wrist", "shoulder"], {
    message: "Type de blessure invalide",
});

const injurySeverityEnum = z.enum(["none", "moderate", "severe", "mild"], {
    message: "Sévérité de blessure invalide",
});

const medicalConditionEnum = z.enum(["diabetes", "none", "asthma", "cardiac", "hypertension"], {
    message: "Condition médicale invalide",
});

const healthGoalEnum = z.enum(["fat_loss", "muscle_gain", "general_health", "endurance"], {
    message: "Objectif de santé invalide",
});

const dateString = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)");

// ─── Create / replace full profile ───────────────────────────────────────────

// Used on POST — all fields optional since metrics can be built progressively
export const createUserProfileSchema = z.object({
    metric_id: z.string().max(50, "metric_id trop long (max 50)").optional(),
    recorded_at: dateString.optional(),
    birth_date: dateString.optional(),
    gender: genderEnum.optional(),
    height_cm: z
        .number({ invalid_type_error: "height_cm doit être un nombre" })
        .positive("La taille doit être positive")
        .max(999, "Taille invalide (max 999 cm)")
        .optional(),
    weight_kg: z
        .number({ invalid_type_error: "weight_kg doit être un nombre" })
        .positive("Le poids doit être positif")
        .max(999, "Poids invalide (max 999 kg)")
        .optional(),
    bmi: z.number({ invalid_type_error: "bmi doit être un nombre" }).min(0).optional(),
    body_fat_percentage: z
        .number({ invalid_type_error: "body_fat_percentage doit être un nombre" })
        .min(0)
        .optional(),
    resting_bpm: z
        .number({ invalid_type_error: "resting_bpm doit être un nombre" })
        .int()
        .min(0)
        .optional(),
    health_goal: healthGoalEnum.optional(),
    target_timeline_weeks: z
        .number({ invalid_type_error: "target_timeline_weeks doit être un nombre" })
        .int()
        .min(0)
        .optional(),
    fitness_level: fitnessLevelEnum.optional(),
    fatigue_score: z
        .number({ invalid_type_error: "fatigue_score doit être un nombre" })
        .int()
        .min(0)
        .optional(),
    has_gym_access: z.boolean().optional(),
    workout_variety_preference: z
        .number({ invalid_type_error: "workout_variety_preference doit être un nombre" })
        .int()
        .min(0)
        .optional(),
    injury_type: injuryTypeEnum.optional(),
    injury_severity: injurySeverityEnum.optional(),
    medical_condition: medicalConditionEnum.optional(),
});

// ─── Partial update ───────────────────────────────────────────────────────────

// Used on PUT /user-profiles/:id — same shape, same constraints
export const updateUserProfileSchema = createUserProfileSchema;

// ─── Validation middleware ────────────────────────────────────────────────────

export const validate = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error.name === "ZodError" || error.errors) {
                return res.status(400).json({
                    success: false,
                    message: "Erreur de validation",
                    errors: error.errors?.map(e => ({
                        field: e.path.join("."),
                        message: e.message
                    })) || [{ field: "unknown", message: error.message }]
                });
            }
            next(error);
        }
    };
};
