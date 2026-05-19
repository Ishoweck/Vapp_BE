import { Router } from 'express';
import { contactController } from '../controllers/contact.controller';
import { asyncHandler } from '../middleware/error';

const router = Router();

router.post('/', asyncHandler(contactController.submit.bind(contactController)));

export default router;
