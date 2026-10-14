import mongoose from 'mongoose';

const HRSeparationTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Separation type name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    approvalMode: {
      type: String,
      enum: ['sequential', 'parallel'],
      default: 'sequential',
    },
    noticePeriodDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiredDepartments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    requiredDocuments: [
      {
        type: String,
        trim: true,
      },
    ],
    generatedDocuments: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    autoDeactivateAccount: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const HRSeparationType = mongoose.models.HRSeparationType
  || mongoose.model('HRSeparationType', HRSeparationTypeSchema);

export default HRSeparationType;