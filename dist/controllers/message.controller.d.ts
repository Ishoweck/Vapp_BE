import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class MessageController {
    /**
     * Send a message
     * POST /messages/send
     */
    sendMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: Send message AS the shared support user (so all admins reply in the same thread)
     * POST /messages/admin/send
     */
    adminSendMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: Start or resume a support session for a conversation
     * POST /messages/admin/sessions/start
     */
    startAdminSession(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: End an active support session
     * POST /messages/admin/sessions/end
     */
    endAdminSession(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: Get active session status for a conversation
     * GET /messages/admin/sessions/:conversationObjectId
     */
    getAdminSession(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: Get messages in any conversation (no sender/receiver filter)
     * GET /messages/admin/conversations/:conversationId
     */
    getAdminMessages(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: Mark all messages in a conversation as read (any admin receiver)
     * PUT /messages/admin/conversations/:conversationId/read
     */
    adminMarkAsRead(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: Get ALL support conversations (any conversation involving any admin/super_admin)
     * GET /messages/admin/conversations
     */
    getAdminConversations(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
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