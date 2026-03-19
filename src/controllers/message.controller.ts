import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { messageService } from '../services/message.service';
import { AppError } from '../middleware/error';
import User from '../models/User';

export class MessageController {
  /**
   * Send a message
   * POST /messages/send
   */
  async sendMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const senderId = req.user!.id;
    const { receiverId, message, messageType, fileUrl, orderId } = req.body;

    if (!receiverId) {
      throw new AppError('Receiver ID is required', 400);
    }

    if (!message && messageType === 'text') {
      throw new AppError('Message content is required', 400);
    }

    if ((messageType === 'image' || messageType === 'file') && !fileUrl) {
      throw new AppError('File URL is required for image/file messages', 400);
    }

    if (senderId === receiverId) {
      throw new AppError('Cannot send message to yourself', 400);
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw new AppError('Receiver not found', 404);
    }

    const result = await messageService.sendMessage(
      senderId,
      receiverId,
      message || '',
      messageType || 'text',
      fileUrl,
      orderId
    );

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
   * Admin: Send message AS the shared support user (so all admins reply in the same thread)
   * POST /messages/admin/send
   */
  async adminSendMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { receiverId, message, messageType, fileUrl } = req.body;

    if (!receiverId || !message) {
      throw new AppError('Receiver ID and message are required', 400);
    }

    // Find the support user (first active admin/super_admin)
    const supportUser = await User.findOne({
      role: { $in: ['admin', 'super_admin'] },
      status: 'active',
    }).select('_id');

    if (!supportUser) {
      throw new AppError('Support user not found', 500);
    }

    const supportUserId = supportUser._id.toString();

    if (supportUserId === receiverId) {
      throw new AppError('Cannot send message to support account', 400);
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw new AppError('Receiver not found', 404);
    }

    // Send message AS the support user (not the currently logged-in admin)
    const result = await messageService.sendMessage(
      supportUserId,
      receiverId,
      message,
      messageType || 'text',
      fileUrl
    );

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      const { conversationId } = result;
      io.to(conversationId).emit('new_message', {
        message: result.message,
        conversationId,
      });
      io.to(`user_${receiverId}`).emit('new_message_notification', {
        message: result.message,
        conversationId,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent as support',
      data: result,
    });
  }

  /**
   * Admin: Get messages in any conversation (no sender/receiver filter)
   * GET /messages/admin/conversations/:conversationId
   */
  async getAdminMessages(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const ChatMessage = require('../models/Additional').ChatMessage;

    // Admin can see ALL messages in the conversation (no sender/receiver filter)
    const messages = await ChatMessage.find({
      conversationId,
      deleted: { $ne: true },
    })
      .populate('sender', 'firstName lastName avatar role')
      .populate('receiver', 'firstName lastName avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ChatMessage.countDocuments({
      conversationId,
      deleted: { $ne: true },
    });

    res.json({
      success: true,
      data: messages.reverse(),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /**
   * Admin: Get ALL support conversations (any conversation involving any admin/super_admin)
   * GET /messages/admin/conversations
   */
  async getAdminConversations(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Find all admin/super_admin user IDs (any status, not just active)
    const adminUsers = await User.find({
      role: { $in: ['admin', 'super_admin', 'financial_admin'] },
    }).select('_id role');
    const adminIds = adminUsers.map((u) => u._id);

    console.log(`[Admin Chat] Found ${adminUsers.length} admin users:`, adminUsers.map(u => ({ id: u._id, role: u.role })));

    // Find conversations where ANY admin is a participant
    const Conversation = require('../models/Conversation').default;

    // First try with isActive, then fallback without it
    let conversations = await Conversation.find({
      participants: { $in: adminIds },
      isActive: true,
    })
      .populate('participants', 'firstName lastName avatar email role')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    let total = await Conversation.countDocuments({
      participants: { $in: adminIds },
      isActive: true,
    });

    // If no active conversations, try without isActive filter (some may not have this field)
    if (total === 0) {
      conversations = await Conversation.find({
        participants: { $in: adminIds },
      })
        .populate('participants', 'firstName lastName avatar email role')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      total = await Conversation.countDocuments({
        participants: { $in: adminIds },
      });
      console.log(`[Admin Chat] No active conversations, found ${total} total (without isActive filter)`);
    }

    console.log(`[Admin Chat] Found ${total} conversations`);

    // Format: show the non-admin participant as the "other"
    const adminIdStrings = adminIds.map((id: any) => id.toString());
    const formatted = conversations.map((conv: any) => {
      const otherParticipant = conv.participants.find(
        (p: any) => !adminIdStrings.includes(p._id.toString())
      ) || conv.participants[0];

      return {
        _id: conv._id,
        otherParticipant,
        participants: conv.participants,
        lastMessage: conv.lastMessage ? {
          message: conv.lastMessage.text || conv.lastMessage.message || '',
          sender: conv.lastMessage.sender,
          createdAt: conv.lastMessage.timestamp || conv.lastMessage.createdAt || conv.updatedAt,
        } : null,
        unreadCount: 0,
        updatedAt: conv.updatedAt,
      };
    });

    res.json({
      success: true,
      data: formatted,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /**
   * Get user's conversations
   * GET /messages/conversations
   */
  async getConversations(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await messageService.getConversations(userId, page, limit);

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
  async getMessages(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!conversationId) {
      throw new AppError('Conversation ID is required', 400);
    }

    const result = await messageService.getMessages(conversationId, userId, page, limit);

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
  async markAsRead(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    if (!conversationId) {
      throw new AppError('Conversation ID is required', 400);
    }

    const result = await messageService.markAsRead(conversationId, userId);

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
  async deleteMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const userId = req.user!.id;
    const { messageId } = req.params;

    const message = await messageService.deleteMessage(messageId, userId);

    if (!message) {
      throw new AppError('Message not found or you are not the sender', 404);
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
  async getUnreadCount(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const userId = req.user!.id;
    const count = await messageService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  }

  /**
   * Start or get a conversation with a specific user
   * POST /messages/conversations/start
   */
  async startConversation(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const userId = req.user!.id;
    const { receiverId, orderId } = req.body;

    if (!receiverId) {
      throw new AppError('Receiver ID is required', 400);
    }

    if (userId === receiverId) {
      throw new AppError('Cannot start a conversation with yourself', 400);
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId).select('firstName lastName avatar role');
    if (!receiver) {
      throw new AppError('User not found', 404);
    }

    const { conversation, conversationId } = await messageService.getOrCreateConversation(
      userId,
      receiverId,
      orderId
    );

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

export const messageController = new MessageController();
