// models/Dispute.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export enum DisputeStatus {
  OPEN = 'open',
  VENDOR_RESPONDED = 'vendor_responded',
  UNDER_REVIEW = 'under_review',
  RESOLVED_FULL_REFUND = 'resolved_full_refund',
  RESOLVED_PARTIAL_REFUND = 'resolved_partial_refund',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

export enum DisputeReason {
  ITEM_NOT_RECEIVED = 'item_not_received',
  ITEM_DAMAGED = 'item_damaged',
  ITEM_NOT_AS_DESCRIBED = 'item_not_as_described',
  WRONG_ITEM = 'wrong_item',
  MISSING_ITEMS = 'missing_items',
  QUALITY_ISSUE = 'quality_issue',
  OTHER = 'other',
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
  user: Types.ObjectId;         // customer who opened the dispute
  vendor: Types.ObjectId;       // vendor being disputed
  reason: DisputeReason;
  description: string;
  evidence?: string[];          // image URLs from customer
  status: DisputeStatus;
  
  // Conversation thread
  messages: IDisputeMessage[];
  
  // Resolution
  resolvedBy?: Types.ObjectId;  // admin who resolved
  resolution?: string;          // admin's resolution note
  refundAmount?: number;
  refundType?: 'full' | 'partial' | 'none';
  
  // Items in dispute (subset of order items, or all)
  disputedItems?: {
    product: Types.ObjectId;
    productName: string;
    quantity: number;
    price: number;
  }[];

  // Deadline
  expiresAt: Date;              // 7 days from order delivery

  createdAt: Date;
  updatedAt: Date;
}

const disputeMessageSchema = new Schema<IDisputeMessage>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['customer', 'vendor', 'admin'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  attachments: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const disputedItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
}, { _id: false });

const disputeSchema = new Schema<IDispute>({
  disputeNumber: {
    type: String,
    required: true,
    unique: true,
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  orderNumber: {
    type: String,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    enum: Object.values(DisputeReason),
    required: true,
  },
  description: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 2000,
  },
  evidence: [String],
  status: {
    type: String,
    enum: Object.values(DisputeStatus),
    default: DisputeStatus.OPEN,
  },

  // Conversation
  messages: [disputeMessageSchema],

  // Resolution
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  resolution: String,
  refundAmount: {
    type: Number,
    default: 0,
  },
  refundType: {
    type: String,
    enum: ['full', 'partial', 'none'],
  },

  // Disputed items
  disputedItems: [disputedItemSchema],

  // Expiry
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
disputeSchema.index({ disputeNumber: 1 });
disputeSchema.index({ order: 1 });
disputeSchema.index({ user: 1, createdAt: -1 });
disputeSchema.index({ vendor: 1, createdAt: -1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ expiresAt: 1 });

const Dispute = mongoose.model<IDispute>('Dispute', disputeSchema);

export default Dispute;