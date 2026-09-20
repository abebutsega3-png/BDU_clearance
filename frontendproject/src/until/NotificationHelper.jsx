import axios from 'axios';

const notificationApiUrl = 'http://localhost:3000/api/notifications';

export const getNotificationHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchNotifications = async () => {
  const response = await axios.get(notificationApiUrl, { headers: getNotificationHeaders() });
  const payload = response.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const fetchNotification = async (id) => {
  const response = await axios.get(`${notificationApiUrl}/${id}`, { headers: getNotificationHeaders() });
  return response.data.notification;
};

export const createNotification = async (notificationData) => {
  const response = await axios.post(notificationApiUrl, notificationData, {
    headers: getNotificationHeaders(),
  });
  return response.data;
};

export const updateNotification = async (id, notificationData) => {
  const response = await axios.put(`${notificationApiUrl}/${id}`, notificationData, {
    headers: getNotificationHeaders(),
  });
  return response.data;
};

export const deleteNotification = async (notificationId) => {
  const response = await axios.delete(`${notificationApiUrl}/${notificationId}`, {
    headers: getNotificationHeaders(),
  });
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await axios.patch(`${notificationApiUrl}/mark-all-read`, {}, {
    headers: getNotificationHeaders(),
  });
  return response.data;
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await axios.patch(`${notificationApiUrl}/${notificationId}`, { isRead: true }, {
    headers: getNotificationHeaders(),
  });
  return response.data;
};
