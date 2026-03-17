import mongoose, { Schema, Document, Types } from 'mongoose';

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

const auditLogSchema = new Schema<IAuditLog>({
  action: {
    type: String,
    required: true,
    index: true,
  },
  entityType: {
    type: String,
    required: true,
    index: true,
  },
  entityId: {
    type: String,
    sparse: true,
    index: true,
  },
  entityName: String,
  admin: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  adminName: {
    type: String,
    required: true,
  },
  adminEmail: {
    type: String,
    required: true,
  },
  adminRole: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  statusCode: {
    type: Number,
    default: 200,
  },
  ip: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    default: '',
  },
  fingerprint: {
    type: String,
    required: true,
    index: true,
  },
  changes: {
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    fields: [String],
  },
  metadata: Schema.Types.Mixed,
  duration: Number,
}, {
  timestamps: true,
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ fingerprint: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
