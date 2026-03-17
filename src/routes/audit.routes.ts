import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import {
  getAuditLogs,
  getAuditStats,
  getEntityAuditTrail,
  getFingerprints,
  getAuditLogDetail,
} from '../controllers/audit.controller';

const router = Router();

// All routes require admin auth
router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', getAuditLogs);
router.get('/stats', getAuditStats);
router.get('/fingerprints', getFingerprints);
router.get('/entity/:entityType/:entityId', getEntityAuditTrail);
router.get('/:id', getAuditLogDetail);

export default router;
