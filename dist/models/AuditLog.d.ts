import mongoose, { Document, Types } from 'mongoose';
export interface IAuditLog extends Document {
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    admin: Types.ObjectId;
    adminName: string;
    adminEmail: string;
    adminRole: string;
    method: string;
    path: string;
    statusCode: number;
    ip: string;
    userAgent: string;
    fingerprint: string;
    changes?: {
        before?: Record<string, any>;
        after?: Record<string, any>;
        fields?: string[];
    };
    metadata?: Record<string, any>;
    duration?: number;
    createdAt: Date;
}
declare const _default: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AuditLog.d.ts.map