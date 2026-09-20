import axios from 'axios';

const propertydashboaredApiUrl = 'http://localhost:3000/api/notifications';

export const getNotificationHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

export const fetchNotifications = async () => {
  const response = await axios.get(propertydashboaredApiUrl, { headers: getNotificationHeaders() });
  return Array.isArray(response.data) ? response.data : response.data.notifications || response.data.data || [];
};

export const fetchNotification = async (id) => {
  const response = await axios.get(`${propertydashboaredApiUrl}/${id}`, { headers: getNotificationHeaders() });
  return response.data.notification;
};

export const createNotification = async (notificationData) => {
  const response = await axios.post(propertydashboaredApiUrl, notificationData, {
    headers: getNotificationHeaders(),
  });
  return response.data;
};

export const updateNotification = async (id, notificationData) => {
  const response = await axios.put(`${propertydashboaredApiUrl}/${id}`, notificationData, {
    headers: getNotificationHeaders(),
  });
  return response.data;
};

export const deleteNotification = async (notificationId) => {
  const response = await axios.delete(`${propertydashboaredApiUrl}/${notificationId}`, {
    headers: getNotificationHeaders(),
  });
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await axios.patch(`${propertydashboaredApiUrl}/mark-all-read`, {}, {
    headers: getNotificationHeaders(),
  });
  return response.data;
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await axios.patch(`${propertydashboaredApiUrl}/${notificationId}`, { isRead: true }, {
    headers: getNotificationHeaders(),
  });
  return response.data;
};
