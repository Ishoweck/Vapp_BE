"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_controller_1 = require("../controllers/message.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All message routes require authentication
router.use(auth_1.authenticate);
// Send a message
router.post('/send', (0, error_1.asyncHandler)(message_controller_1.messageController.sendMessage.bind(message_controller_1.messageController)));
// Get unread count (must be before /:conversationId to avoid conflict)
router.get('/unread-count', (0, error_1.asyncHandler)(message_controller_1.messageController.getUnreadCount.bind(message_controller_1.messageController)));
// Admin: Get all support conversations (any conversation involving any admin user)
router.get('/admin/conversations', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(message_controller_1.messageController.getAdminConversations.bind(message_controller_1.messageController)));
// Admin: Send message as the shared support user (all admins reply in same thread)
router.post('/admin/send', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(message_controller_1.messageController.adminSendMessage.bind(message_controller_1.messageController)));
// Admin: Get messages in any conversation (no sender/receiver filter)
router.get('/admin/conversations/:conversationId', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(message_controller_1.messageController.getAdminMessages.bind(message_controller_1.messageController)));
// Get user's conversations
router.get('/conversations', (0, error_1.asyncHandler)(message_controller_1.messageController.getConversations.bind(message_controller_1.messageController)));
// Start or get a conversation
router.post('/conversations/start', (0, error_1.asyncHandler)(message_controller_1.messageController.startConversation.bind(message_controller_1.messageController)));
// Get messages in a conversation
router.get('/conversations/:conversationId', (0, error_1.asyncHandler)(message_controller_1.messageController.getMessages.bind(message_controller_1.messageController)));
// Mark conversation messages as read
router.put('/conversations/:conversationId/read', (0, error_1.asyncHandler)(message_controller_1.messageController.markAsRead.bind(message_controller_1.messageController)));
// Delete a message
router.delete('/:messageId', (0, error_1.asyncHandler)(message_controller_1.messageController.deleteMessage.bind(message_controller_1.messageController)));
exports.default = router;
//# sourceMappingURL=message.routes.js.map