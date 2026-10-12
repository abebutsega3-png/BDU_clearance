import { io } from 'socket.io-client';

const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
  .replace(/\/api\/?$/, '')
  .replace(/\/+$/, '');

let socket;
const notificationListeners = new Set();

const handleNotification = (notification) => {
  notificationListeners.forEach((listener) => listener(notification));
};

const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  if (!socket) {
    socket = io(socketUrl, { autoConnect: false, auth: { token } });
    socket.on('notification:new', handleNotification);
    socket.on('connect_error', () => {
      const latestToken = localStorage.getItem('token');
      if (latestToken && latestToken !== socket.auth.token) {
        socket.auth = { token: latestToken };
        socket.connect();
      }
    });
  } else if (socket.auth.token !== token) {
    socket.auth = { token };
  }

  if (!socket.connected) socket.connect();
};

export const subscribeToNotifications = (listener) => {
  notificationListeners.add(listener);
  connectSocket();

  return () => {
    notificationListeners.delete(listener);
    if (!notificationListeners.size && socket) {
      socket.disconnect();
      socket = undefined;
    }
  };
};
