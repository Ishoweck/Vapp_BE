import mongoose, { Document, Types } from 'mongoose';
export interface ITicket extends Document {
    ticketId: string;
    userId: Types.ObjectId;
    adminId: Types.ObjectId;
    sessionId: Types.ObjectId;
    conversationId: string;
    summary: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    notes?: string;
    resolvedAt?: Date;
    resolvedBy?: Types.ObjectId;
}
declare const _default: mongoose.Model<ITicket, {}, {}, {}, mongoose.Document<unknown, {}, ITicket, {}, {}> & ITicket & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Ticket.d.ts.map