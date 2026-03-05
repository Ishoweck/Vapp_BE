"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeReason = exports.DisputeStatus = void 0;
// models/Dispute.ts
const mongoose_1 = __importStar(require("mongoose"));
var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["OPEN"] = "open";
    DisputeStatus["VENDOR_RESPONDED"] = "vendor_responded";
    DisputeStatus["UNDER_REVIEW"] = "under_review";
    DisputeStatus["RESOLVED_FULL_REFUND"] = "resolved_full_refund";
    DisputeStatus["RESOLVED_PARTIAL_REFUND"] = "resolved_partial_refund";
    DisputeStatus["REJECTED"] = "rejected";
    DisputeStatus["CLOSED"] = "closed";
})(DisputeStatus || (exports.DisputeStatus = DisputeStatus = {}));
var DisputeReason;
(function (DisputeReason) {
    DisputeReason["ITEM_NOT_RECEIVED"] = "item_not_received";
    DisputeReason["ITEM_DAMAGED"] = "item_damaged";
    DisputeReason["ITEM_NOT_AS_DESCRIBED"] = "item_not_as_described";
    DisputeReason["WRONG_ITEM"] = "wrong_item";
    DisputeReason["MISSING_ITEMS"] = "missing_items";
    DisputeReason["QUALITY_ISSUE"] = "quality_issue";
    DisputeReason["OTHER"] = "other";
})(DisputeReason || (exports.DisputeReason = DisputeReason = {}));
const disputeMessageSchema = new mongoose_1.Schema({
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const disputedItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const disputeSchema = new mongoose_1.Schema({
    disputeNumber: {
        type: String,
        required: true,
        unique: true,
    },
    order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    orderNumber: {
        type: String,
        required: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    vendor: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
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
const Dispute = mongoose_1.default.model('Dispute', disputeSchema);
exports.default = Dispute;
//# sourceMappingURL=Dispute.js.map