import mongoose from 'mongoose';

const libraryOfficerSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'User'
    },
    generalSettings: {
      libraryName: { type: String, trim: true, default: 'Bahir Dar University Library' },
      officeName: { type: String, trim: true, default: 'Library Office' },
      contactEmail: { type: String, trim: true, lowercase: true, default: '' },
      phoneNumber: { type: String, trim: true, default: '' },
      location: { type: String, trim: true, default: '' }
    },
    clearanceRules: {
      checkUnreturnedBooks: { type: Boolean, default: true },
      checkOverdueBooks: { type: Boolean, default: true },
      checkOutstandingFines: { type: Boolean, default: true },
      checkLostDamagedBooks: { type: Boolean, default: true },
      requireChecklistCompletion: { type: Boolean, default: true }
    },
    notificationPreferences: {
      newClearanceRequest: { type: Boolean, default: true },
      resubmittedClearance: { type: Boolean, default: true },
      clearanceStatusUpdated: { type: Boolean, default: true }
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