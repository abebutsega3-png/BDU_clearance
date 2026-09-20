import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

const NOTIFICATIONS_API = 'http://localhost:3000/api/notifications';
const PROPERTY_NOTIFICATION_TYPES = [
  'NEW_CLEARANCE_REQUEST',
  'CLEARANCE_READY_FOR_PROPERTY',
  'CLEARANCE_REQUEST',
  'CLEARANCE_RESUBMITTED',
  'PROPERTY_PENDING_REMINDER',
  'ACTION_REQUIRED',
  'OBLIGATION_FOUND'
];

export default function PropertyNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('All'); // 'All' | 'Unread' | 'Clearance' | 'Assets'
  const [loading, setLoading] = useState(true);

  // Fetch Notifications from DB
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${NOTIFICATIONS_API}/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const userNotifications = response.data.data || [];
        const propertyNotifications = userNotifications.filter((item) => PROPERTY_NOTIFICATION_TYPES.includes(item.type));
        setNotifications(propertyNotifications);
        setUnreadCount(propertyNotifications.filter((item) => !item.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const refreshInterval = window.setInterval(fetchNotifications, 15000);
    return () => window.clearInterval(refreshInterval);
  }, []);

  // Handle Mark as Read and Action Click
  const handleActionClick = async (notification) => {
    if (!notification.isRead) {
      try {
        const token = localStorage.getItem('token');
        await axios.patch(`${NOTIFICATIONS_API}/${notification._id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Local state update
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    // Redirect or trigger view modal based on notification reference
    if (notification.actionLink && notification.actionLink !== '#') {
      navigate(notification.actionLink);
    } else if (notification.relatedRequestId) {
      navigate(`/property/clearance-requests`);
    } else if (notification.relatedAssetId) {
      navigate(`/property/asset-records?assetId=${encodeURIComponent(notification.relatedAssetId)}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${NOTIFICATIONS_API}/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      setNotifications((current) => current.filter((item) => item._id !== id));
      setUnreadCount((current) => Math.max(0, current - (notifications.find((item) => item._id === id)?.isRead ? 0 : 1)));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Filter Logic
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'Unread') return !n.isRead;
    if (filter === 'Clearance') return !n.relatedAssetId;
    if (filter === 'Assets') return Boolean(n.relatedAssetId);
    return true;
  });

  const getNotificationTone = (type) => {
    if (type === 'NEW_CLEARANCE_REQUEST') return 'border-red-200 bg-red-50/60';
    if (type === 'CLEARANCE_RESUBMITTED') return 'border-orange-200 bg-orange-50/60';
    if (type === 'PROPERTY_PENDING_REMINDER') return 'border-amber-200 bg-amber-50/60';
    if (type === 'CLEARANCE_APPROVED') return 'border-emerald-200 bg-emerald-50/60';
    return 'border-blue-200 bg-blue-50/60';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-50 min-h-screen font-sans text-xs text-slate-800">
      
      {/* Header & Unread Counter Badge */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-base font-bold text-slate-900">🔔 Notifications</h1>
          <span className="px-2 py-0.5 bg-teal-700 text-white font-bold rounded-full text-[11px]">
            {unreadCount}
          </span>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-1 bg-slate-200 p-1 rounded-md">
          {['All', 'Unread', 'Clearance', 'Assets'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                filter === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading notifications...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-10 text-slate-400 bg-white rounded border border-slate-200">
          No notifications found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <div
              key={item._id}
              className={`p-4 rounded-lg border transition-all flex justify-between items-start ${
                !item.isRead
                  ? `${getNotificationTone(item.type)} shadow-sm`
                  : 'bg-white border-slate-200 opacity-90'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    item.type === 'NEW_CLEARANCE_REQUEST' ? 'bg-red-600' :
                    item.type === 'CLEARANCE_RESUBMITTED' ? 'bg-orange-500' :
                    item.type === 'PROPERTY_PENDING_REMINDER' ? 'bg-amber-500' :
                    item.type === 'CLEARANCE_APPROVED' ? 'bg-emerald-600' :
                    !item.isRead ? 'bg-blue-600' : 'bg-slate-300'
                  }`}></span>
                  <h2 className="font-bold text-slate-900 text-xs">{item.title}</h2>
                  {item.relatedRequestId && (
                    <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                      {item.relatedRequestId}
                    </span>
                  )}
                </div>

                <p className="text-slate-600 pl-4">{item.message}</p>
                
                <span className="block text-[10px] text-slate-400 pl-4 pt-1">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleActionClick(item)}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded shadow-sm text-[11px] transition-all whitespace-nowrap"
                >
                  {item.actionText || (item.relatedAssetId ? 'View Asset' : 'View Request')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item._id)}
                  title="Delete notification"
                  aria-label="Delete notification"
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}