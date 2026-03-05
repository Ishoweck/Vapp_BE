"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_controller_1 = require("../controllers/message.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const router = (0, express_1.Router)();
// All message routes require authentication
router.use(auth_1.authenticate);
// Send a message
router.post('/send', (0, error_1.asyncHandler)(message_controller_1.messageController.sendMessage.bind(message_controller_1.messageController)));
// Get unread count (must be before /:conversationId to avoid conflict)
router.get('/unread-count', (0, error_1.asyncHandler)(message_controller_1.messageController.getUnreadCount.bind(message_controller_1.messageController)));
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