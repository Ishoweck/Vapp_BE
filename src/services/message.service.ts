import { ChatMessage } from '../models/Additional';
import Conversation from '../models/Conversation';
import User from '../models/User';
import { NotificationType } from '../types';
import { notificationService } from './notification.service';
import { logger } from '../utils/logger';

class MessageService {
  /**
   * Generate a deterministic conversationId from two user IDs
   */
  generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  /**
   * Get or create a conversation between two users
   */
  async getOrCreateConversation(userId1: string, userId2: string, orderId?: string) {
    const conversationId = this.generateConversationId(userId1, userId2);

    let conversation = await Conversation.findOne({
      participants: { $all: [userId1, userId2], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId1, userId2],
        unreadCount: new Map([[userId1, 0], [userId2, 0]]),
        ...(orderId && { orderId }),
      });
    }

    return { conversation, conversationId };
  }

  /**
   * Send a message
   */
  async sendMessage(
    senderId: string,
    receiverId: string,
    message: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    fileUrl?: string,
    orderId?: string
  ) {
    const { conversation, conversationId } = await this.getOrCreateConversation(senderId, receiverId, orderId);

    // Create the chat message
    const chatMessage = await ChatMessage.create({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      message,
      messageType,
      fileUrl,
      orderId,
    });

    // Update conversation with last message
    const currentUnread = conversation.unreadCount.get(receiverId) || 0;
    conversation.unreadCount.set(receiverId, currentUnread + 1);
    conversation.lastMessage = {
      text: messageType === 'text' ? message : `Sent ${messageType === 'image' ? 'an image' : 'a file'}`,
      sender: chatMessage.sender,
      timestamp: new Date(),
      messageType,
    };
    await conversation.save();

    // Populate sender info for the response
    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate('sender', 'firstName lastName avatar')
      .populate('receiver', 'firstName lastName avatar');

    // Send push notification to receiver
    try {
      const sender = await User.findById(senderId).select('firstName lastName');
      const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Someone';
      const notifMessage = messageType === 'text'
        ? message.substring(0, 100)
        : `Sent ${messageType === 'image' ? 'an image' : 'a file'}`;

      await notificationService.send({
        userId: receiverId,
        type: NotificationType.CHAT,
        title: `New message from ${senderName}`,
        message: notifMessage,
        data: { conversationId, senderId, senderName, messageId: chatMessage._id?.toString() },
        link: `/messages/${conversationId}`,
      });
    } catch (error: any) {
      logger.error('Failed to send chat notification:', error.message);
    }

    return {
      message: populatedMessage,
      conversationId,
      conversation,
    };
  }

  /**
   * Get conversations for a user
   */
  async getConversations(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    })
      .populate('participants', 'firstName lastName avatar role')
      .populate('orderId', 'orderNumber')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Conversation.countDocuments({
      participants: userId,
      isActive: true,
    });

    // Add the other participant info and unread count for each conversation
    const formattedConversations = conversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p: any) => p._id.toString() !== userId
      );
      const unread = conv.unreadCount.get(userId) || 0;
      const conversationId = this.generateConversationId(
        conv.participants[0]._id.toString(),
        conv.participants[1]._id.toString()
      );

      return {
        _id: conv._id,
        conversationId,
        otherParticipant,
        lastMessage: conv.lastMessage,
        unreadCount: unread,
        orderId: conv.orderId,
        updatedAt: (conv as any).updatedAt,
      };
    });

    return {
      conversations: formattedConversations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, userId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find({
      conversationId,
      deleted: { $ne: true },
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate('sender', 'firstName lastName avatar')
      .populate('receiver', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ChatMessage.countDocuments({
      conversationId,
      deleted: { $ne: true },
      $or: [{ sender: userId }, { receiver: userId }],
    });

    return {
      messages: messages.reverse(),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mark messages as read in a conversation
   */
  async markAsRead(conversationId: string, userId: string) {
    // Mark all unread messages sent TO this user as read
    const result = await ChatMessage.updateMany(
      {
        conversationId,
        receiver: userId,
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    // Reset unread count for this user in the conversation
    // Extract the other user's ID from the conversationId (format: sortedId1_sortedId2)
    const ids = conversationId.split('_');
    const otherUserId = ids[0] === userId ? ids[1] : ids[0];

    if (otherUserId) {
      const conv = await Conversation.findOne({
        participants: { $all: [userId, otherUserId], $size: 2 },
      });
      if (conv) {
        conv.unreadCount.set(userId, 0);
        await conv.save();
      }
    }

    return { markedCount: result.modifiedCount };
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await ChatMessage.findOne({
      _id: messageId,
      sender: userId,
    });

    if (!message) {
      return null;
    }

    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    return message;
  }

  /**
   * Get total unread message count across all conversations
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await ChatMessage.countDocuments({
      receiver: userId,
      read: false,
      deleted: { $ne: true },
    });

    return count;
  }

  /**
   * Get a single conversation by its generated ID and user
   */
  async getConversationByParticipants(userId1: string, userId2: string) {
    return Conversation.findOne({
      participants: { $all: [userId1, userId2], $size: 2 },
    });
  }
}

export const messageService = new MessageService();
