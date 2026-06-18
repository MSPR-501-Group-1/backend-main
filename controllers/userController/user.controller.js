import * as userService from "../../services/userService/user.service.js";
import * as authService from "../../services/authService/auth.service.js";
import multer from "multer";
import * as storageService from "../../services/storageService/storage.service.js";

// Get all users
export const getUsers = async (req, res) => {
    try {
        const result = await userService.getUsers();

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("Erreur getUsers:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des utilisateurs"
        });
    }
};

// Get a user by it's id
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userService.getUserById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Erreur getUserById:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération de l'utilisateur"
        });
    }
};

// Create a user with a body
export const createUser = async (req, res) => {
    try {
        const user = await userService.createUser(req.body);

        res.status(201).json({
            success: true,
            message: "Utilisateur créé avec succès",
            data: user
        });

    } catch (error) {
        if (error.message === "EMAIL_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Cet email est déjà utilisé"
            });
        }
        if (error.message === "PASSWORD_REQUIRED") {
            return res.status(400).json({
                success: false,
                message: "Le mot de passe est requis"
            });
        }
        console.error("Erreur createUser:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la création de l'utilisateur"
        });
    }
};

// Update a user by it's id
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userService.updateUser(id, req.body);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            message: "Utilisateur mis à jour avec succès",
            data: user
        });
    } catch (error) {
        if (error.message === "EMAIL_EXISTS") {
            return res.status(409).json({
                success: false,
                message: "Cet email est déjà utilisé"
            });
        }
        if (error.message === "NO_FIELDS_TO_UPDATE") {
            return res.status(400).json({
                success: false,
                message: "Aucun champ à mettre à jour"
            });
        }
        console.error("Erreur updateUser:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la mise à jour de l'utilisateur"
        });
    }
};

// PATCH /users/:id/social-profile
export const updateUserSocialProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { display_name } = req.body;

        let avatar_url = undefined;

        // Validation si le display_name est envoyé
        if (display_name !== undefined && display_name.trim() === "") {
            return res.status(400).json({ success: false, message: "Le nom d'affichage ne peut pas être vide." });
        }

        // Si un fichier physique a été joint à la requête, on le pousse sur le stockage
        if (req.file) {
            avatar_url = await storageService.uploadFile(req.file.buffer, req.file.mimetype, "avatars");
        }

        // On passe les variables au service. Si display_name ou avatar_url sont 'undefined', ils ne seront pas modifiés (Comportement PATCH)
        const updatedUser = await userService.updateSocialProfile(id, {
            display_name: display_name ? display_name.trim() : undefined,
            avatar_url
        });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        }

        res.status(200).json({
            success: true,
            message: "Profil social mis à jour avec succès",
            data: updatedUser
        });
    } catch (error) {
        console.error("Erreur dans updateUserSocialProfile:", error);
        res.status(500).json({ success: false, message: "Erreur lors de la mise à jour du profil social" });
    }
};

// Soft delete a user by it's id
export const softDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await userService.softDeleteUser(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            message: "Utilisateur désactivé avec succès"
        });
    } catch (error) {
        console.error("Erreur softDeleteUser :", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression de l'utilisateur"
        });
    }
};

// Hard delete a user by it's id
export const hardDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await userService.hardDeleteUser(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            message: "Utilisateur supprimé définitivement"
        });
    } catch (error) {
        console.error("Erreur hardDeleteUser:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression définitive"
        });
    }
};

// Change user's password (owner or admin)
export const changePassword = async (req, res) => {
    try {
        const { id } = req.params;

        // accept both camelCase and snake_case from request body
        const currentPassword = req.body.currentPassword || req.body.current_password;
        const newPassword = req.body.newPassword || req.body.new_password;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Champs de mot de passe manquants" });
        }

        // authService will throw errors for not found / invalid password
        await authService.changePassword(id, currentPassword, newPassword);

        res.status(200).json({ success: true, message: "Mot de passe changé avec succès" });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        }
        if (error.message === "INVALID_PASSWORD") {
            return res.status(400).json({ success: false, message: "Mot de passe actuel invalide" });
        }
        console.error("Erreur changePassword:", error);
        res.status(500).json({ success: false, message: "Erreur lors du changement de mot de passe" });
    }
};

// --- Avatar upload ---

const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
    fileFilter: (_req, file, cb) => {
        if (storageService.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(Object.assign(new Error("FILE_TYPE_NOT_ALLOWED"), { code: "FILE_TYPE_NOT_ALLOWED" }));
        }
    },
});

export const avatarUploadMiddleware = (req, res, next) => {
    avatarUpload.single("avatar")(req, res, (err) => {
        if (!err) return next();
        if (err.code === "FILE_TYPE_NOT_ALLOWED") {
            return res.status(400).json({ success: false, message: "Type de fichier non autorisé (images uniquement)" });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ success: false, message: "Fichier trop volumineux (max 5 Mo)" });
        }
        next(err);
    });
};

// PUT /users/:id/avatar — Mettre à jour la photo de profil
export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Aucun fichier fourni" });
        }
        const avatar_url = await storageService.uploadFile(req.file.buffer, req.file.mimetype, "avatars");
        await userService.updateAvatarUrl(req.params.id, avatar_url);
        res.status(200).json({ success: true, data: { avatar_url } });
    } catch (err) {
        if (err.message === "USER_NOT_FOUND") {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        }
        console.error("Erreur uploadAvatar:", err);
        res.status(500).json({ success: false, message: "Erreur lors de l'upload de l'avatar" });
    }
};