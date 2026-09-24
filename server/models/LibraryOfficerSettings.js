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
      resubmittedClearance: { type: Boolean, default: true },
      verificationRequired: { type: Boolean, default: true },
      clearanceApproved: { type: Boolean, default: true },
      clearanceReturned: { type: Boolean, default: true },
      employeeInformationUpdated: { type: Boolean, default: true },
      systemNotifications: { type: Boolean, default: true }
    },
    clearanceChecklist: {
      borrowedBooksChecked: { type: Boolean, default: true },
      unreturnedBooksChecked: { type: Boolean, default: true },
      outstandingMaterialsChecked: { type: Boolean, default: true },
      lostDamagedMaterialsChecked: { type: Boolean, default: true },
      libraryAccountChecked: { type: Boolean, default: true }
    },
    deliveryPreferences: {
      inSystemNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true }
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