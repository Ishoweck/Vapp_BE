import mongoose, { Document, Types } from 'mongoose';
export interface IAccountDeletionRequest extends Document {
    user: Types.ObjectId;
    reason: string;
    additionalDetails?: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    userRole: 'customer' | 'vendor';
    hasPendingOrders?: boolean;
    pendingOrdersCount?: number;
    processedBy?: Types.ObjectId;
    processedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const AccountDeletionRequest: mongoose.Model<IAccountDeletionRequest, {}, {}, {}, mongoose.Document<unknown, {}, IAccountDeletionRequest, {}, {}> & IAccountDeletionRequest & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default AccountDeletionRequest;
//# sourceMappingURL=AccountDeletionRequest.d.ts.map