import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import * as socialController from "../controllers/socialController/social.controller.js";

const router = express.Router();

// GET  /posts       — Flux de publications
router.get("/",    authenticate, socialController.getFeed);

// POST /posts       — Créer un post (multipart/form-data : champ "text" + fichier optionnel "media")
router.post("/",   authenticate, socialController.uploadMiddleware, socialController.createPost);

// DELETE /posts/:id — Supprimer un post (propriétaire ou admin)
router.delete("/:id", authenticate, socialController.deletePost);

export default router;
