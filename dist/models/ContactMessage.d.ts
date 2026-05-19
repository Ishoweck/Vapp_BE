import mongoose, { Document } from 'mongoose';
export interface IContactMessage extends Document {
    name: string;
    email: string;
    subject?: string;
    message: string;
    createdAt: Date;
}
export declare const ContactMessage: mongoose.Model<IContactMessage, {}, {}, {}, mongoose.Document<unknown, {}, IContactMessage, {}, {}> & IContactMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ContactMessage.d.ts.map