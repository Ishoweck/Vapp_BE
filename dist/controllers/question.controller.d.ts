import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class QuestionController {
    /**
     * Ask a question about a product
     */
    askQuestion(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get questions for a product
     */
    getProductQuestions(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Answer a question (vendor only)
     */
    answerQuestion(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Update a question (only by the asker)
     */
    updateQuestion(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Delete a question (only by the asker, or vendor)
     */
    deleteQuestion(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Mark question as helpful
     */
    markHelpful(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Report a question
     */
    reportQuestion(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get user's questions
     */
    getMyQuestions(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get vendor's unanswered questions
     */
    getVendorQuestions(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Format question for response
     */
    private formatQuestion;
}
export declare const questionController: QuestionController;
//# sourceMappingURL=question.controller.d.ts.map