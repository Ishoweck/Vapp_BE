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
// models/ProductQuestion.ts
const mongoose_1 = __importStar(require("mongoose"));
const ProductQuestionSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    question: {
        type: String,
        required: [true, 'Question is required'],
        trim: true,
        maxlength: [1000, 'Question cannot exceed 1000 characters'],
    },
    answer: {
        type: String,
        trim: true,
        maxlength: [2000, 'Answer cannot exceed 2000 characters'],
    },
    answeredBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    answeredAt: {
        type: Date,
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
    helpful: {
        type: Number,
        default: 0,
    },
    helpfulBy: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    reported: {
        type: Boolean,
        default: false,
    },
    reportReason: {
        type: String,
    },
}, {
    timestamps: true,
});
// Compound index for efficient queries
ProductQuestionSchema.index({ product: 1, createdAt: -1 });
ProductQuestionSchema.index({ product: 1, answeredAt: -1 });
exports.default = mongoose_1.default.model('ProductQuestion', ProductQuestionSchema);
//# sourceMappingURL=ProductQuestion.js.map