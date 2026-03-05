declare class MessageService {
    /**
     * Generate a deterministic conversationId from two user IDs
     */
    generateConversationId(userId1: string, userId2: string): string;
    /**
     * Get or create a conversation between two users
     */
    getOrCreateConversation(userId1: string, userId2: string, orderId?: string): Promise<{
        conversation: import("mongoose").Document<unknown, {}, import("../models/Conversation").IConversation, {}, {}> & import("../models/Conversation").IConversation & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        conversationId: string;
    }>;
    /**
     * Send a message
     */
    sendMessage(senderId: string, receiverId: string, message: string, messageType?: 'text' | 'image' | 'file', fileUrl?: string, orderId?: string): Promise<{
        message: import("mongoose").Document<unknown, {}, import("../models/Additional").IChatMessage, {}, {}> & import("../models/Additional").IChatMessage & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        conversationId: string;
        conversation: import("mongoose").Document<unknown, {}, import("../models/Conversation").IConversation, {}, {}> & import("../models/Conversation").IConversation & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
    }>;
    /**
     * Get conversations for a user
     */
    getConversations(userId: string, page?: number, limit?: number): Promise<{
        conversations: {
            _id: import("mongoose").Types.ObjectId;
            conversationId: string;
            otherParticipant: import("mongoose").Types.ObjectId;
            lastMessage: {
                text: string;
                sender: import("mongoose").Types.ObjectId;
                timestamp: Date;
                messageType: "text" | "image" | "file";
            };
            unreadCount: number;
            orderId: import("mongoose").Types.ObjectId;
            updatedAt: any;
        }[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get messages for a conversation
     */
    getMessages(conversationId: string, userId: string, page?: number, limit?: number): Promise<{
        messages: (import("mongoose").Document<unknown, {}, import("../models/Additional").IChatMessage, {}, {}> & import("../models/Additional").IChatMessage & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Mark messages as read in a conversation
     */
    markAsRead(conversationId: string, userId: string): Promise<{
        markedCount: number;
    }>;
    /**
     * Delete a message (soft delete)
     */
    deleteMessage(messageId: string, userId: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Additional").IChatMessage, {}, {}> & import("../models/Additional").IChatMessage & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Get total unread message count across all conversations
     */
    getUnreadCount(userId: string): Promise<number>;
    /**
     * Get a single conversation by its generated ID and user
     */
    getConversationByParticipants(userId1: string, userId2: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Conversation").IConversation, {}, {}> & import("../models/Conversation").IConversation & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export declare const messageService: MessageService;
export {};
//# sourceMappingURL=message.service.d.ts.map