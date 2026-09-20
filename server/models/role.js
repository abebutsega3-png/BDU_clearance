import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  module: { type: String, required: true, trim: true },
  actions: [{ type: String, enum: ['view', 'create', 'edit', 'delete', 'submit', 'approve', 'reject', 'cancel', 'export'] }],
}, { _id: false });

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '', trim: true },
  permissions: { type: [permissionSchema], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Role = mongoose.model('Role', roleSchema);
export default Role;