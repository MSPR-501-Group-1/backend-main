import multer from "multer";
import * as socialService from "../../services/socialService/social.service.js";
import * as storageService from "../../services/storageService/storage.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 Mo max
  fileFilter: (_req, file, cb) => {
    if (storageService.ALLOWED_MEDIA_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error("FILE_TYPE_NOT_ALLOWED"), { code: "FILE_TYPE_NOT_ALLOWED" }));
    }
  },
});

// Middleware multer avec gestion d'erreurs inline (compatible Express 5)
export const uploadMiddleware = (req, res, next) => {
  upload.single("media")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "FILE_TYPE_NOT_ALLOWED") {
      return res.status(400).json({
        success: false,
        message: "Type de fichier non autorisé (images et vidéos uniquement)",
      });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Fichier trop volumineux (max 100 Mo)",
      });
    }
    next(err);
  });
};

// GET /posts — Flux de publications
export const getFeed = async (req, res) => {
  try {
    const posts = await socialService.getPosts();
    res.status(200).json({ success: true, data: posts });
  } catch (err) {
    console.error("Erreur getFeed:", err);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération du feed" });
  }
};

// POST /posts — Créer un post (texte et/ou média)
export const createPost = async (req, res) => {
  try {
    const user_id  = req.user.user_id;
    const text     = req.body.text?.trim() || null;

    let media_url  = null;
    let media_type = null;

    if (req.file) {
      media_type = req.file.mimetype.startsWith("video/") ? "video" : "image";
      media_url  = await storageService.uploadFile(req.file.buffer, req.file.mimetype, "posts");
    }

    const post = await socialService.createPost(user_id, { text, media_url, media_type });
    res.status(201).json({ success: true, data: post });
  } catch (err) {
    if (err.message === "POST_EMPTY") {
      return res.status(400).json({ success: false, message: "Le post doit contenir du texte ou un média" });
    }
    console.error("Erreur createPost:", err);
    res.status(500).json({ success: false, message: "Erreur lors de la création du post" });
  }
};

// DELETE /posts/:id — Supprimer un post
export const deletePost = async (req, res) => {
  try {
    await socialService.deletePost(req.params.id, req.user.user_id, req.user.role_type);
    res.status(200).json({ success: true, message: "Post supprimé" });
  } catch (err) {
    if (err.message === "POST_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Post introuvable" });
    }
    if (err.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "Accès non autorisé" });
    }
    console.error("Erreur deletePost:", err);
    res.status(500).json({ success: false, message: "Erreur lors de la suppression du post" });
  }
};
