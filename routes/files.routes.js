import { Router } from "express";
const router = Router();

import * as filesController from "../controllers/filesController/files.controller.js";

// GET /files/:type/:filename
router.get("/:type/:filename", filesController.downloadFile);

export default router;