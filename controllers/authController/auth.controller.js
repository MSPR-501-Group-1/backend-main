import * as userService from "../../services/userService/user.service.js";
import * as authService from "../../services/authService/auth.service.js";
import { generateToken } from "../../middlewares/auth.middleware.js";

// Register a new user
export const register = async (req, res) => {
    try {
        const userData = req.body;
        const user = await userService.createUser(userData);

        // User metrics are populated later via the onboarding quiz

        res.status(201).json({
            success: true,
            message: "Inscription réussie, profil utilisateur créé !",
            data: {
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role_type: user.role_type,
                    history_id: user.history_id
                }
            }
        });
    } catch (error) {
        if (error.message === "EMAIL_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Cet email est déjà utilisé"
            });
        }
        console.error("Erreur inscription:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de l'inscription"
        });
    }
};

// Log the user in
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authService.login(email, password);

        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: "Connexion réussie",
            data: {
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role_type: user.role_type
                },
                token
            }
        });
    } catch (error) {
        if (error.message === "INVALID_CREDENTIALS") {
            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect"
            });
        }
        if (error.message === "ACCOUNT_DISABLED") {
            return res.status(403).json({
                success: false,
                message: "Compte désactivé"
            });
        }
        console.error("Erreur connexion:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la connexion"
        });
    }
};

// Get the currently connected user
export const getMe = async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.user_id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                user_id: user.user_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                birth_date: user.birth_date,
                gender_code: user.gender_code,
                role_type: user.role_type,
                created_at: user.created_at,
                is_active: user.is_active
            }
        });
    } catch (error) {
        console.error("Erreur getMe:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération du profil"
        });
    }
};

// Refresh token
export const refreshToken = async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.user_id);

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: "Utilisateur non valide"
            });
        }

        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: "Token rafraîchi",
            data: { token }
        });
    } catch (error) {
        console.error("Erreur refreshToken:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors du rafraîchissement du token"
        });
    }
};

// Change password
export const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        await userService.changePassword(req.user.user_id, current_password, new_password);

        res.status(200).json({
            success: true,
            message: "Mot de passe modifié avec succès"
        });
    } catch (error) {
        if (error.message === "INVALID_PASSWORD") {
            return res.status(401).json({
                success: false,
                message: "Mot de passe actuel incorrect"
            });
        }
        console.error("Erreur changePassword:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors du changement de mot de passe"
        });
    }
};

// Logout
export const logout = async (req, res) => {
    // TODO -> Delete the token on client side (in the localStorage)
    res.status(200).json({
        success: true,
        message: "Déconnexion réussie"
    });
};
