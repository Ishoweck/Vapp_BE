import mongoose, { Document, Types } from 'mongoose';
export interface IProductQuestion extends Document {
    product: Types.ObjectId;
    user: Types.ObjectId;
    question: string;
    answer?: string;
    answeredBy?: Types.ObjectId;
    answeredAt?: Date;
    isPublic: boolean;
    helpful: number;
    helpfulBy: Types.ObjectId[];
    reported: boolean;
    reportReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IProductQuestion, {}, {}, {}, mongoose.Document<unknown, {}, IProductQuestion, {}, {}> & IProductQuestion & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ProductQuestion.d.ts.map