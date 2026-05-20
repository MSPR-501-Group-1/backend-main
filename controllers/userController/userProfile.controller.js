import * as userProfileService from "../../services/userService/userProfile.service.js";

// GET /users/:id/profile
export const getUserProfile = async (req, res) => {
    try {
        const profile = await userProfileService.getUserProfileById(req.params.id);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profil utilisateur non trouvé"
            });
        }

        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        console.error("Erreur getUserProfile:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération du profil"
        });
    }
};

// POST /users/:id/profile — creates the profile row for a given user_id
export const createUserProfile = async (req, res) => {
    try {
        const profile = await userProfileService.createUserProfile(
            req.params.id,
            req.body
        );

        res.status(201).json({
            success: true,
            message: "Profil créé avec succès",
            data: profile
        });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }
        console.error("Erreur createUserProfile:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la création du profil"
        });
    }
};

// PUT /users/:id/profile — owner or admin
export const updateUserProfile = async (req, res) => {
    try {
        const profile = await userProfileService.updateUserProfile(
            req.params.id,
            req.body
        );

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profil utilisateur non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profil mis à jour avec succès",
            data: profile
        });
    } catch (error) {
        if (error.message === "NO_FIELDS_TO_UPDATE") {
            return res.status(400).json({
                success: false,
                message: "Aucun champ à mettre à jour"
            });
        }
        console.error("Erreur updateUserProfile:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la mise à jour du profil"
        });
    }
};

// DELETE /users/:id/profile — admin only
export const deleteUserProfile = async (req, res) => {
    try {
        const result = await userProfileService.deleteUserProfile(req.params.id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Profil utilisateur non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profil supprimé avec succès"
        });
    } catch (error) {
        console.error("Erreur deleteUserProfile:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression du profil"
        });
    }
};