import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { uploadController } from '../controllers/upload.controller';

const router = Router();

// ============================================================
// MULTER CONFIGURATION FOR IMAGES (existing)
// ============================================================
const imageStorage = multer.memoryStorage();
const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ============================================================
// ✅ NEW MULTER CONFIGURATION FOR KYC DOCUMENTS (images + PDFs)
// ============================================================
const kycStorage = multer.memoryStorage();
const kycUpload = multer({
  storage: kycStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept any image or PDF — don't reject based on extension since
    // mobile camera/gallery images may have non-standard names
    const mimetype = file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');

    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'));
    }
  },
});

// ============================================================
// ROUTES
// ============================================================

router.use(authenticate);

/**
 * POST /api/v1/upload/vendor-image
 * Upload vendor logo or banner
 */
router.post(
  '/vendor-image',
  imageUpload.single('image'),
  asyncHandler(uploadController.uploadVendorImage.bind(uploadController))
);

/**
 * ✅ NEW ROUTE
 * POST /api/v1/upload/kyc-document
 * Upload KYC document (images or PDFs)
 */
router.post(
  '/kyc-document',
  kycUpload.single('document'),
  asyncHandler(uploadController.uploadKYCDocument.bind(uploadController))
);

export default router;