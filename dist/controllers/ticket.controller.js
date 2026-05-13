"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketController = exports.TicketController = void 0;
const ticket_service_1 = require("../services/ticket.service");
const error_1 = require("../middleware/error");
class TicketController {
    async getTickets(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const { search, status, priority } = req.query;
        const result = await ticket_service_1.ticketService.getTickets({ search, status, priority, page, limit });
        res.json({
            success: true,
            data: result.tickets,
            meta: { page: result.page, limit, total: result.total, totalPages: result.totalPages },
        });
    }
    async getTicket(req, res) {
        const { ticketId } = req.params;
        const ticket = await ticket_service_1.ticketService.getTicket(ticketId);
        if (!ticket)
            throw new error_1.AppError('Ticket not found', 404);
        res.json({ success: true, data: ticket });
    }
    async updateTicket(req, res) {
        const { ticketId } = req.params;
        const { status, priority, notes } = req.body;
        const ticket = await ticket_service_1.ticketService.updateTicket(ticketId, {
            status,
            priority,
            notes,
            resolvedBy: req.user.id,
        });
        if (!ticket)
            throw new error_1.AppError('Ticket not found', 404);
        res.json({ success: true, data: ticket });
    }
    async getStats(req, res) {
        const stats = await ticket_service_1.ticketService.getStats();
        res.json({ success: true, data: stats });
    }
}
exports.TicketController = TicketController;
exports.ticketController = new TicketController();
//# sourceMappingURL=ticket.controller.js.map