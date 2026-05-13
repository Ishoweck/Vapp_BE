import mongoose, { Schema, Document, Types } from 'mongoose';

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

const ticketSchema = new Schema<ITicket>(
  {
    ticketId:       { type: String, required: true, unique: true },
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    adminId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId:      { type: Schema.Types.ObjectId, ref: 'SupportSession', required: true },
    conversationId: { type: String, required: true },
    summary:        { type: String, required: true },
    category:       { type: String, default: 'General Inquiry' },
    priority:       { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status:         { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    notes:          String,
    resolvedAt:     Date,
    resolvedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ userId: 1 });
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ createdAt: -1 });

export default mongoose.model<ITicket>('Ticket', ticketSchema);
