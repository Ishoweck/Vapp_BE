export declare const ticketService: {
    createFromSession(params: {
        sessionId: string;
        userId: string;
        adminId: string;
        conversationId: string;
        startedAt: Date;
        endedAt: Date;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/Ticket").ITicket, {}, {}> & import("../models/Ticket").ITicket & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getTickets(filters: {
        search?: string;
        status?: string;
        priority?: string;
        page: number;
        limit: number;
    }): Promise<{
        tickets: (import("mongoose").Document<unknown, {}, import("../models/Ticket").ITicket, {}, {}> & import("../models/Ticket").ITicket & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getTicket(ticketId: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Ticket").ITicket, {}, {}> & import("../models/Ticket").ITicket & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateTicket(ticketId: string, updates: {
        status?: string;
        priority?: string;
        notes?: string;
        resolvedBy?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../models/Ticket").ITicket, {}, {}> & import("../models/Ticket").ITicket & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getStats(): Promise<{
        open: number;
        in_progress: number;
        resolved: number;
        closed: number;
        urgent: number;
    }>;
};
//# sourceMappingURL=ticket.service.d.ts.map