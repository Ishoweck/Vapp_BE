import mongoose, { Schema, Document } from 'mongoose';

export interface IAppVersion extends Document {
  latestVersion: string;
  minVersion: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
  updateMessage: string;
  isForceUpdate: boolean;
}

const appVersionSchema = new Schema<IAppVersion>(
  {
    latestVersion: { type: String, required: true },
    minVersion: { type: String, required: true },
    iosStoreUrl: { type: String, default: '' },
    androidStoreUrl: { type: String, default: '' },
    updateMessage: {
      type: String,
      default: 'A new version of VendorSpot is available. Please update to continue.',
    },
    isForceUpdate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IAppVersion>('AppVersion', appVersionSchema);
