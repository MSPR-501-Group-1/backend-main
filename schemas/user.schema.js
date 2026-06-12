import { z } from "zod";

export const createUserSchema = z.object({
    email: z
        .string()
        .email("Email invalide")
        .max(50, "Email trop long (max 50)"),
    password: z
        .string()
        .min(8, "Le mot de passe doit contenir au moins 8 caractères")
        .max(100, "Mot de passe trop long")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre"
        ),
    first_name: z
        .string()
        .min(1, "Prénom requis")
        .max(50, "Prénom trop long (max 50)"),
    last_name: z
        .string()
        .min(1, "Nom requis")
        .max(50, "Nom trop long (max 50)"),
    birth_date: z
        .string()
        .regex(
            /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?)?$/,
            "Format de date invalide (YYYY-MM-DD ou ISO 8601)"
        )
        .optional(),
    gender_code: z
        .number({ invalid_type_error: "gender_code doit être un entier" })
        .int("gender_code doit être un entier")
        .optional(),
    role_type: z
        .enum(['FREEMIUM', 'PREMIUM', 'PREMIUM_PLUS', 'B2B', 'ADMIN'], { message: "Rôle invalide, doit être l'un de ces valeurs : 'FREEMIUM', 'PREMIUM', 'PREMIUM_PLUS', 'B2B', 'ADMIN' " })
        .optional(),
    is_active: z.boolean().optional()
});

// Schema for updating profile
// Owner: can update personal info, but NOT role_type or is_active
export const ownerUpdateUserSchema = z.object({
    email: z
        .string()
        .email("Email invalide")
        .max(50, "Email trop long (max 50)")
        .optional(),
    first_name: z
        .string()
        .min(1, "Prénom requis")
        .max(50, "Prénom trop long (max 50)")
        .optional(),
    last_name: z
        .string()
        .min(1, "Nom requis")
        .max(50, "Nom trop long (max 50)")
        .optional(),
    display_name: z
        .string()
        .min(1, "Nom d'affichage requis")
        .max(100, "Nom d'affichage trop long (max 100)")
        .optional(),
    birth_date: z
        .string()
        .regex(
            /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?)?$/,
            "Format de date invalide (YYYY-MM-DD ou ISO 8601)"
        )
        .optional(),
    gender_code: z
        .number({ invalid_type_error: "gender_code doit être un entier" })
        .int("gender_code doit être un entier")
        .optional()
});

// Admin: full update including role_type and is_active
export const adminUpdateUserSchema = z.object({
    email: z
        .string()
        .email("Email invalide")
        .max(50, "Email trop long (max 50)")
        .optional(),
    first_name: z
        .string()
        .min(1, "Prénom requis")
        .max(50, "Prénom trop long (max 50)")
        .optional(),
    last_name: z
        .string()
        .min(1, "Nom requis")
        .max(50, "Nom trop long (max 50)")
        .optional(),
    display_name: z
        .string()
        .min(1, "Nom d'affichage requis")
        .max(100, "Nom d'affichage trop long (max 100)")
        .optional(),
    birth_date: z
        .string()
        .regex(
            /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?)?$/,
            "Format de date invalide (YYYY-MM-DD ou ISO 8601)"
        )
        .optional(),
    gender_code: z
        .number({ invalid_type_error: "gender_code doit être un entier" })
        .int("gender_code doit être un entier")
        .optional(),
    role_type: z
        .enum(['FREEMIUM', 'PREMIUM', 'PREMIUM_PLUS', 'B2B', 'ADMIN'], { message: "Rôle invalide, doit être l'un de ces valeurs : 'FREEMIUM', 'PREMIUM', 'PREMIUM_PLUS', 'B2B', 'ADMIN' " })
        .optional(),
    is_active: z.boolean().optional()
});

export const changePasswordSchema = z.object({
    current_password: z
        .string()
        .min(1, "Mot de passe actuel requis"),
    new_password: z
        .string()
        .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères")
        .max(100, "Mot de passe trop long")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre"
        )
});