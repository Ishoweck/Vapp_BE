import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class TicketController {
    getTickets(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    getTicket(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    updateTicket(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    getStats(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const ticketController: TicketController;
//# sourceMappingURL=ticket.controller.d.ts.map