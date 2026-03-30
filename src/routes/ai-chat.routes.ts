import { Router } from 'express';
import { aiChatController } from '../controllers/ai-chat.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';

const router = Router();

// AI chat endpoint - requires authentication
router.post(
  '/',
  authenticate,
  asyncHandler(aiChatController.chat.bind(aiChatController))
);

export default router;
