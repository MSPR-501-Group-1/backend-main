import { Router } from 'express';
import { requestUpload, confirmUpload } from '../controllers/mediaController.js';

const router = Router();

router.post('/request-upload', requestUpload);
router.post('/confirm-upload', confirmUpload);

export default router;
