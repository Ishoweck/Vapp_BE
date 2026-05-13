import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { ticketService } from '../services/ticket.service';
import { AppError } from '../middleware/error';

export class TicketController {
  async getTickets(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { search, status, priority } = req.query as Record<string, string>;

    const result = await ticketService.getTickets({ search, status, priority, page, limit });

    res.json({
      success: true,
      data: result.tickets,
      meta: { page: result.page, limit, total: result.total, totalPages: result.totalPages },
    });
  }

  async getTicket(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { ticketId } = req.params;
    const ticket = await ticketService.getTicket(ticketId);
    if (!ticket) throw new AppError('Ticket not found', 404);
    res.json({ success: true, data: ticket });
  }

  async updateTicket(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { ticketId } = req.params;
    const { status, priority, notes } = req.body;

    const ticket = await ticketService.updateTicket(ticketId, {
      status,
      priority,
      notes,
      resolvedBy: req.user!.id,
    });

    if (!ticket) throw new AppError('Ticket not found', 404);
    res.json({ success: true, data: ticket });
  }

  async getStats(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const stats = await ticketService.getStats();
    res.json({ success: true, data: stats });
  }
}

export const ticketController = new TicketController();
