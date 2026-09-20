import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  FileText,
  RefreshCw,
  Info,
  CheckCheck,
  ChevronRight
  ,Trash2
} from 'lucide-react';

export default function LibraryNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('All'); // 'All', 'Unread', 'Clearance', 'Reports'

  // Notifications ከ Backend መሳብ
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/api/library-notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      setNotifications(res.data);
      setUnreadCount(res.data.filter((item) => !item.isRead).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/api/library-notifications/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      setNotifications((current) => current.filter((item) => item._id !== id));
      setUnreadCount((current) => Math.max(0, current - (notifications.find((item) => item._id === id)?.isRead ? 0 : 1)));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // 1. Mark single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(`http://localhost:3000/api/library-notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // 2. Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch('http://localhost:3000/api/library-notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Filter Logic
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'Unread') return !item.isRead;
    return true; // 'All'
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'New Clearance Request':
        return <Bell className="text-amber-500" size={16} />;
      case 'Clearance Resubmitted':
        return <RefreshCw className="text-blue-500" size={16} />;
      case 'Clearance Awaiting Your Review':
      case 'Library Action Required':
        return <Info className="text-amber-500" size={16} />;
      case 'Outstanding Library Material':
      case 'Outstanding Library Fine':
        return <FileText className="text-orange-500" size={16} />;
      default:
        return <Bell className="text-slate-400" size={16} />;
    }
  };

  const getDestination = (item) => {
    return item.actionLink || (item.relatedRequestId ? `/library-office/clearance-requests?requestId=${item.relatedRequestId}` : '/library-office/clearance-requests');
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-xs text-slate-700">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Bell size={18} className="text-teal-700" />
              <span>Library Notifications</span>
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Manage and track your clearance request alerts and report updates.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleMarkAllAsRead}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <CheckCheck size={14} />
              <span>Mark All as Read</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-2 bg-slate-200/60 p-1 rounded-xl w-fit font-semibold text-[11px]">
          {['All', 'Unread'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}{tab === 'Unread' ? ` (${unreadCount})` : ''}
            </button>
          ))}
        </div>

        {/* Notification Cards List */}
        <div className="space-y-2">
          {loading ? (
            <div className="bg-white p-6 text-center text-slate-400 rounded-xl border border-slate-200">
              Loading notifications...
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((item) => (
              <div
                key={item._id}
                className={`p-4 rounded-xl border transition-all flex justify-between items-center ${
                  item.isRead
                    ? 'bg-white border-slate-200'
                    : 'bg-teal-50/40 border-teal-200 shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900">{item.title}</h3>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                      )}
                    </div>
                    <p className="text-slate-600 leading-relaxed">{item.message}</p>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 pt-1">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {item.requestId && (
                        <span className="font-semibold text-teal-700">
                          ID: {item.relatedRequestId || item.clearanceRequestId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Link Button */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (!item.isRead) handleMarkAsRead(item._id);
                      navigate(getDestination(item));
                    }}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg flex items-center space-x-1 transition-colors text-[11px]"
                  >
                    <span>{item.actionText || 'Review'}</span>
                    <ChevronRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id)}
                    title="Delete notification"
                    aria-label="Delete notification"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-8 text-center text-slate-400 rounded-xl border border-slate-200">
              No notifications found in this category.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}