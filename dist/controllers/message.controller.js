"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageController = exports.MessageController = void 0;
const message_service_1 = require("../services/message.service");
const error_1 = require("../middleware/error");
const User_1 = __importDefault(require("../models/User"));
class MessageController {
    /**
     * Send a message
     * POST /messages/send
     */
    async sendMessage(req, res) {
        const senderId = req.user.id;
        const { receiverId, message, messageType, fileUrl, orderId } = req.body;
        if (!receiverId) {
            throw new error_1.AppError('Receiver ID is required', 400);
        }
        if (!message && messageType === 'text') {
            throw new error_1.AppError('Message content is required', 400);
        }
        if ((messageType === 'image' || messageType === 'file') && !fileUrl) {
            throw new error_1.AppError('File URL is required for image/file messages', 400);
        }
        if (senderId === receiverId) {
            throw new error_1.AppError('Cannot send message to yourself', 400);
        }
        // Verify receiver exists
        const receiver = await User_1.default.findById(receiverId);
        if (!receiver) {
            throw new error_1.AppError('Receiver not found', 404);
        }
        const result = await message_service_1.messageService.sendMessage(senderId, receiverId, message || '', messageType || 'text', fileUrl, orderId);
        // Emit via socket if available
        const io = req.app.get('io');
        if (io) {
            const { conversationId } = result;
            // Emit to the conversation room
            io.to(conversationId).emit('new_message', {
                message: result.message,
                conversationId,
            });
            // Also emit to receiver's personal room in case they haven't joined the conversation room yet
            io.to(`user_${receiverId}`).emit('new_message_notification', {
                message: result.message,
                conversationId,
            });
        }
        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: {
                message: result.message,
                conversationId: result.conversationId,
            },
        });
    }
    /**
     * Get user's conversations
     * GET /messages/conversations
     */
    async getConversations(req, res) {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await message_service_1.messageService.getConversations(userId, page, limit);
        res.json({
            success: true,
            data: result.conversations,
            meta: {
                page: result.page,
                limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        });
    }
    /**
     * Get messages in a conversation
     * GET /messages/conversations/:conversationId
     */
    async getMessages(req, res) {
        const userId = req.user.id;
        const { conversationId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        if (!conversationId) {
            throw new error_1.AppError('Conversation ID is required', 400);
        }
        const result = await message_service_1.messageService.getMessages(conversationId, userId, page, limit);
        res.json({
            success: true,
            data: result.messages,
            meta: {
                page: result.page,
                limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        });
    }
    /**
     * Mark all messages in a conversation as read
     * PUT /messages/conversations/:conversationId/read
     */
    async markAsRead(req, res) {
        const userId = req.user.id;
        const { conversationId } = req.params;
        if (!conversationId) {
            throw new error_1.AppError('Conversation ID is required', 400);
        }
        const result = await message_service_1.messageService.markAsRead(conversationId, userId);
        // Emit read receipt via socket
        const io = req.app.get('io');
        if (io) {
            io.to(conversationId).emit('messages_read', {
                conversationId,
                readBy: userId,
                readAt: new Date(),
            });
        }
        res.json({
            success: true,
            message: 'Messages marked as read',
            data: { markedCount: result.markedCount },
        });
    }
    /**
     * Delete a message
     * DELETE /messages/:messageId
     */
    async deleteMessage(req, res) {
        const userId = req.user.id;
        const { messageId } = req.params;
        const message = await message_service_1.messageService.deleteMessage(messageId, userId);
        if (!message) {
            throw new error_1.AppError('Message not found or you are not the sender', 404);
        }
        // Emit deletion via socket
        const io = req.app.get('io');
        if (io) {
            io.to(message.conversationId).emit('message_deleted', {
                messageId,
                conversationId: message.conversationId,
            });
        }
        res.json({
            success: true,
            message: 'Message deleted',
        });
    }
    /**
     * Get total unread message count
     * GET /messages/unread-count
     */
    async getUnreadCount(req, res) {
        const userId = req.user.id;
        const count = await message_service_1.messageService.getUnreadCount(userId);
        res.json({
            success: true,
            data: { unreadCount: count },
        });
    }
    /**
     * Start or get a conversation with a specific user
     * POST /messages/conversations/start
     */
    async startConversation(req, res) {
        const userId = req.user.id;
        const { receiverId, orderId } = req.body;
        if (!receiverId) {
            throw new error_1.AppError('Receiver ID is required', 400);
        }
        if (userId === receiverId) {
            throw new error_1.AppError('Cannot start a conversation with yourself', 400);
        }
        // Verify receiver exists
        const receiver = await User_1.default.findById(receiverId).select('firstName lastName avatar role');
        if (!receiver) {
            throw new error_1.AppError('User not found', 404);
        }
        const { conversation, conversationId } = await message_service_1.messageService.getOrCreateConversation(userId, receiverId, orderId);
        res.json({
            success: true,
            data: {
                conversationId,
                conversation,
                otherParticipant: receiver,
            },
        });
    }
}
exports.MessageController = MessageController;
exports.messageController = new MessageController();
//# sourceMappingURL=message.controller.js.map