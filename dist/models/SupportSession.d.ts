import mongoose, { Document, Types } from 'mongoose';
export interface ISupportSession extends Document {
    conversationId: string;
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
declare const _default: mongoose.Model<ISupportSession, {}, {}, {}, mongoose.Document<unknown, {}, ISupportSession, {}, {}> & ISupportSession & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=SupportSession.d.ts.map