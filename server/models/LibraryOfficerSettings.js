import mongoose from 'mongoose';

const libraryOfficerSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'User'
    },
    notificationPreferences: {
      newClearanceRequest: { type: Boolean, default: true },
      returnedResubmitted: { type: Boolean, default: true },
      clearanceStatusUpdate: { type: Boolean, default: true },
      reportRequest: { type: Boolean, default: true }
    },
    displayPreferences: {
      itemsPerPage: { type: Number, default: 10 },
      defaultRequestFilter: {
        type: String,
        enum: ['All', 'Pending', 'Under Review', 'Approved', 'Returned', 'Completed'],
        default: 'Pending'
      }
    },
    language: {
      type: String,
      enum: ['English', 'Amharic'],
      default: 'English'
    }
  },
  { timestamps: true }
);

const LibraryOfficerSettings = mongoose.model('LibraryOfficerSettings', libraryOfficerSettingsSchema);

export default LibraryOfficerSettings;