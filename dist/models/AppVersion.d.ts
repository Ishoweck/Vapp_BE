import mongoose, { Document } from 'mongoose';
export interface IAppVersion extends Document {
    latestVersion: string;
    minVersion: string;
    iosStoreUrl: string;
    androidStoreUrl: string;
    updateMessage: string;
    isForceUpdate: boolean;
}
declare const _default: mongoose.Model<IAppVersion, {}, {}, {}, mongoose.Document<unknown, {}, IAppVersion, {}, {}> & IAppVersion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AppVersion.d.ts.map