import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class MessageController {
    /**
     * Send a message
     * POST /messages/send
     */
    sendMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get user's conversations
     * GET /messages/conversations
     */
    getConversations(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get messages in a conversation
     * GET /messages/conversations/:conversationId
     */
    getMessages(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Mark all messages in a conversation as read
     * PUT /messages/conversations/:conversationId/read
     */
    markAsRead(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Delete a message
     * DELETE /messages/:messageId
     */
    deleteMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get total unread message count
     * GET /messages/unread-count
     */
    getUnreadCount(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Start or get a conversation with a specific user
     * POST /messages/conversations/start
     */
    startConversation(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const messageController: MessageController;
//# sourceMappingURL=message.controller.d.ts.map