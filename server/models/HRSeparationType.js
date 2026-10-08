import mongoose from 'mongoose';

const HRSeparationTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Separation type name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
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
  },
  {
    timestamps: true,
  }
);

const HRSeparationType = mongoose.models.HRSeparationType
  || mongoose.model('HRSeparationType', HRSeparationTypeSchema);

export default HRSeparationType;