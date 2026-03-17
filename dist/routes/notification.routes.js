"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const router = (0, express_1.Router)();
// All notification routes require authentication
router.use(auth_1.authenticate);
router.get('/', (0, error_1.asyncHandler)(notification_controller_1.notificationController.getNotifications.bind(notification_controller_1.notificationController)));
// Notification preferences
router.get('/preferences', (0, error_1.asyncHandler)(notification_controller_1.notificationController.getPreferences.bind(notification_controller_1.notificationController)));
router.put('/preferences', (0, error_1.asyncHandler)(notification_controller_1.notificationController.updatePreferences.bind(notification_controller_1.notificationController)));
router.get('/unread-count', (0, error_1.asyncHandler)(notification_controller_1.notificationController.getUnreadCount.bind(notification_controller_1.notificationController)));
router.put('/mark-all-read', (0, error_1.asyncHandler)(notification_controller_1.notificationController.markAllAsRead.bind(notification_controller_1.notificationController)));
router.put('/:notificationId/read', (0, error_1.asyncHandler)(notification_controller_1.notificationController.markAsRead.bind(notification_controller_1.notificationController)));
router.delete('/clear-all', (0, error_1.asyncHandler)(notification_controller_1.notificationController.clearAll.bind(notification_controller_1.notificationController)));
router.delete('/:notificationId', (0, error_1.asyncHandler)(notification_controller_1.notificationController.deleteNotification.bind(notification_controller_1.notificationController)));
// FCM token management
router.post('/fcm-token', (0, error_1.asyncHandler)(notification_controller_1.notificationController.registerFcmToken.bind(notification_controller_1.notificationController)));
router.delete('/fcm-token', (0, error_1.asyncHandler)(notification_controller_1.notificationController.unregisterFcmToken.bind(notification_controller_1.notificationController)));
exports.default = router;
//# sourceMappingURL=notification.routes.js.map