import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';
import { getSlides, createSlide, deleteSlide, updateSlide } from '../controllers/carousel.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB image limit for slides
  }
});

// GET /api/carousel (authenticated users can fetch slides)
router.get('/', authenticateToken, getSlides);

// POST /api/carousel (superadmin only)
router.post('/', authenticateToken, requireSuperAdmin, upload.single('image'), createSlide);

// PUT /api/carousel/:id (superadmin only)
router.put('/:id', authenticateToken, requireSuperAdmin, upload.single('image'), updateSlide);

// DELETE /api/carousel/:id (superadmin only)
router.delete('/:id', authenticateToken, requireSuperAdmin, deleteSlide);

export default router;
