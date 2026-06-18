import express from "express";
import * as controller from "../controllers/userController/user.controller.js";
import { validate, requireOwnerOrAdmin, requireRole, selectUpdateSchema, authenticate } from "../middlewares/auth.middleware.js";
import { changePasswordSchema, createUserSchema } from "../schemas/user.schema.js";

const router = express.Router();

router.get("/", authenticate, requireRole("ADMIN"), controller.getUsers);
router.post("/", authenticate, requireRole("ADMIN"), validate(createUserSchema), controller.createUser);
router.delete("/:id/hard", authenticate, requireRole("ADMIN"), controller.hardDeleteUser);
router.get("/:id", authenticate, requireOwnerOrAdmin, controller.getUserById);
router.delete("/:id", authenticate, requireOwnerOrAdmin, controller.softDeleteUser);
router.put("/:id", authenticate, requireOwnerOrAdmin, selectUpdateSchema, controller.updateUser);
router.put("/:id/password", authenticate, requireOwnerOrAdmin, validate(changePasswordSchema), controller.changePassword);
router.patch("/:id/social-profile", authenticate, requireOwnerOrAdmin, controller.avatarUploadMiddleware, controller.updateUserSocialProfile);
router.put("/:id/avatar", authenticate, requireOwnerOrAdmin, controller.avatarUploadMiddleware, controller.uploadAvatar);

export default router;
