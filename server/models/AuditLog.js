import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, default: '' },

    action: {
      type: String,
      required: true,
      uppercase: true,
    },

    module: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: '',
    },

    ipAddress: {
      type: String,
      default: '',
    },

    userAgent: {
      type: String,
      default: '',
      field: 'user_agent',
    },

    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      field: 'old_values',
    },

    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      field: 'new_values',
    },

  }, { timestamps: true, collection: 'audit_logs' });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1 });

export default mongoose.model('AuditLog', auditLogSchema);