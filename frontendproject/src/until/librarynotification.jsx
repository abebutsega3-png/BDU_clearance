export const LIBRARY_NOTIFICATION_TYPES = [
  'New Clearance Request',
  'Clearance Awaiting Your Review',
  'Clearance Resubmitted',
  'Outstanding Library Material',
  'Outstanding Library Fine',
  'Library Action Required'
];

export function isAllowedLibraryNotification(notification = {}) {
  return LIBRARY_NOTIFICATION_TYPES.includes(notification.type);
}
