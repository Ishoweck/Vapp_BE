import mongoose, { Document, Types } from 'mongoose';
export declare enum DisputeStatus {
    OPEN = "open",
    VENDOR_RESPONDED = "vendor_responded",
    UNDER_REVIEW = "under_review",
    RESOLVED_FULL_REFUND = "resolved_full_refund",
    RESOLVED_PARTIAL_REFUND = "resolved_partial_refund",
    REJECTED = "rejected",
    CLOSED = "closed"
}
export declare enum DisputeReason {
    ITEM_NOT_RECEIVED = "item_not_received",
    ITEM_DAMAGED = "item_damaged",
    ITEM_NOT_AS_DESCRIBED = "item_not_as_described",
    WRONG_ITEM = "wrong_item",
    MISSING_ITEMS = "missing_items",
    QUALITY_ISSUE = "quality_issue",
    OTHER = "other"
}
export interface IDisputeMessage {
    sender: Types.ObjectId;
    senderRole: 'customer' | 'vendor' | 'admin';
    message: string;
    attachments?: string[];
    createdAt: Date;
}
export interface IDispute extends Document {
    disputeNumber: string;
    order: Types.ObjectId;
    orderNumber: string;
    user: Types.ObjectId;
    vendor: Types.ObjectId;
    reason: DisputeReason;
    description: string;
    evidence?: string[];
    status: DisputeStatus;
    messages: IDisputeMessage[];
    resolvedBy?: Types.ObjectId;
    resolution?: string;
    refundAmount?: number;
    refundType?: 'full' | 'partial' | 'none';
    disputedItems?: {
        product: Types.ObjectId;
        productName: string;
        quantity: number;
        price: number;
    }[];
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Dispute: mongoose.Model<IDispute, {}, {}, {}, mongoose.Document<unknown, {}, IDispute, {}, {}> & IDispute & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Dispute;
//# sourceMappingURL=Dispute.d.ts.map