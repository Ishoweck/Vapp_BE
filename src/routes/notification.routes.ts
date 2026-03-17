import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', asyncHandler(notificationController.getNotifications.bind(notificationController)));

// Notification preferences
router.get('/preferences', asyncHandler(notificationController.getPreferences.bind(notificationController)));
router.put('/preferences', asyncHandler(notificationController.updatePreferences.bind(notificationController)));

router.get('/unread-count', asyncHandler(notificationController.getUnreadCount.bind(notificationController)));

router.put('/mark-all-read', asyncHandler(notificationController.markAllAsRead.bind(notificationController)));

router.put('/:notificationId/read', asyncHandler(notificationController.markAsRead.bind(notificationController)));

router.delete('/clear-all', asyncHandler(notificationController.clearAll.bind(notificationController)));

router.delete('/:notificationId', asyncHandler(notificationController.deleteNotification.bind(notificationController)));

// FCM token management
router.post('/fcm-token', asyncHandler(notificationController.registerFcmToken.bind(notificationController)));

router.delete('/fcm-token', asyncHandler(notificationController.unregisterFcmToken.bind(notificationController)));

export default router;
