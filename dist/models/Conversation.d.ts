import mongoose, { Document, Types } from 'mongoose';
export interface IConversation extends Document {
    participants: Types.ObjectId[];
    lastMessage: {
        text: string;
        sender: Types.ObjectId;
        timestamp: Date;
        messageType: 'text' | 'image' | 'file';
    };
    unreadCount: Map<string, number>;
    orderId?: Types.ObjectId;
    isActive: boolean;
}
declare const _default: mongoose.Model<IConversation, {}, {}, {}, mongoose.Document<unknown, {}, IConversation, {}, {}> & IConversation & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Conversation.d.ts.map