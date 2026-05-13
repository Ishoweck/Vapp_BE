import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISupportSession extends Document {
  conversationId: string;        // generated "id1_id2" string
  conversationObjectId: Types.ObjectId;
  adminId: Types.ObjectId;
  userId: Types.ObjectId;
  adminName: string;
  status: 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
  lastActivityAt: Date;
  endReason?: 'admin' | 'timeout';
}

const supportSessionSchema = new Schema<ISupportSession>(
  {
    conversationId:       { type: String, required: true },
    conversationObjectId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    adminId:              { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userId:               { type: Schema.Types.ObjectId, ref: 'User', required: true },
    adminName:            { type: String, required: true },
    status:               { type: String, enum: ['active', 'ended'], default: 'active' },
    startedAt:            { type: Date, default: Date.now },
    endedAt:              Date,
    lastActivityAt:       { type: Date, default: Date.now },
    endReason:            { type: String, enum: ['admin', 'timeout'] },
  },
  { timestamps: true }
);

supportSessionSchema.index({ conversationId: 1, status: 1 });
supportSessionSchema.index({ adminId: 1, status: 1 });

export default mongoose.model<ISupportSession>('SupportSession', supportSessionSchema);
