import mongoose, { Schema, Document, Types } from 'mongoose';
import { VendorVerificationStatus, IKYCDocument, IPayoutDetails } from '../types';

export interface IVendorProfile extends Document {
  user: Types.ObjectId;
  businessName: string;
  businessDescription?: string;
  businessLogo?: string;
  businessBanner?: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
  businessPhone: string;
  businessEmail: string;
  businessWebsite?: string;
  kycDocuments: IKYCDocument[];
  verificationStatus: VendorVerificationStatus;
  verifiedAt?: Date;
  payoutDetails?: IPayoutDetails;
  followers: Schema.Types.ObjectId[]; // ✅ ADD THIS FIELD

  commissionRate: number;
  totalSales: number;
  totalOrders: number;
  averageRating: number;
  totalReviews: number;
  isPremium: boolean;
  isActive: boolean;
  storefront: {
    theme?: string;
    bannerImages?: string[];
    customMessage?: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

const vendorProfileSchema = new Schema<IVendorProfile>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  businessDescription: {
    type: String,
    maxlength: 1000,
  },
  businessLogo: String,
  businessBanner: String,
  businessAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true, default: 'Nigeria' },
  },
  businessPhone: {
    type: String,
    required: true,
  },
  businessEmail: {
    type: String,
    required: true,
  },
  businessWebsite: String,
  kycDocuments: [{
    type: {
      type: String,
      enum: ['NIN', 'CAC', 'ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'UTILITY_BILL'],
      required: true,
    },
    documentUrl: {
      type: String,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedAt: Date,
    rejectionReason: String,
  }],
  verificationStatus: {
    type: String,
    enum: Object.values(VendorVerificationStatus),
    default: VendorVerificationStatus.PENDING,
  },
  verifiedAt: Date,
  
  payoutDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    bankCode: String,
  },
    followers: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      index: true,
    },
  commissionRate: {
    type: Number,
    default: 5,
    min: 0,
    max: 100,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  totalOrders: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  storefront: {
    theme: String,
    bannerImages: [String],
    customMessage: String,
  },
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
  },
}, {
  timestamps: true,
});

// Indexes
vendorProfileSchema.index({ user: 1 });
vendorProfileSchema.index({ verificationStatus: 1 });
vendorProfileSchema.index({ isActive: 1 });
vendorProfileSchema.index({ followers: 1 }); // ✅ ADD THIS LINE


const VendorProfile = mongoose.model<IVendorProfile>('VendorProfile', vendorProfileSchema);

export default VendorProfile;
