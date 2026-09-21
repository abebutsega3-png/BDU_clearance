import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCircle, Clock, RotateCcw, MessageSquare,
  CheckCheck, Trash2, Eye, Filter
} from 'lucide-react';
import { getICTOfficerSettings } from './ICTSettings';

const API_URL = 'http://localhost:3000/api';

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

const ICT_NOTIFICATION_TYPES = new Set([
  'NEW_CLEARANCE_REQUEST',
  'NEW_ICT_CLEARANCE_REQUEST',
  'CLEARANCE_READY_FOR_ICT',
  'CLEARANCE_RESUBMITTED',
  'PENDING_CLEARANCE_REMINDER',
  'PENDING_REVIEW_REMINDER',
  'ACTION_REQUIRED',
]);

const getNotificationType = (item = {}) => String(item.type || item.title || '')
  .toUpperCase()
  .replace(/\s+/g, '_');

const inferSeverity = (type = '') => {
  const value = String(type).toLowerCase();

  if (value.includes('returned') || value.includes('action')) return 'critical';
  if (value.includes('approved')) return 'success';
  if (value.includes('pending') || value.includes('reminder')) return 'warning';
  return 'info';
};

const normalizeNotification = (item = {}) => {
  const createdAt = item.createdAt ? new Date(item.createdAt) : new Date();

  return {
    id: item._id || item.id || String(Date.now() + Math.random()),
    type: item.title || item.type || 'Notification',
    eventType: getNotificationType(item),
    category: 'Clearance',
    employeeName: item.targetName || item.employeeName || 'Employee',
    employeeId: item.employeeId || '',
    message: item.message || 'Notification received.',
    requestId: item.relatedRequestId || item.clearanceRequestId || '',
    actionText: item.actionText || 'View Request',
    actionLink: item.actionLink || '/ict-office/clearance-requests',
    date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    isRead: Boolean(item.isRead),
    severity: item.severity || inferSeverity(item.type || item.title),
    assetDetails: item.assetDetails || null,
  };
};

const ICTNotifications = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/notifications/my`, getAuthConfig());
      const payload = response.data?.data ?? response.data?.notifications ?? response.data ?? [];
      const normalized = Array.isArray(payload) ? payload.map(normalizeNotification) : [];
      setNotifications(normalized);
    } catch (error) {
      console.error('Unable to load ICT notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(`${API_URL}/notifications/${id}/read`, {}, getAuthConfig());
      loadNotifications();
    } catch (error) {
      console.error('Unable to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch(`${API_URL}/notifications/mark-all-read`, {}, getAuthConfig());
      loadNotifications();
    } catch (error) {
      console.error('Unable to mark all notifications as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/notifications/${id}`, getAuthConfig());
      loadNotifications();
    } catch (error) {
      console.error('Unable to delete notification:', error);
    }
  };

  const handleViewRequest = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    const requestPath = notification.requestId
      ? `/ict-office/requests?requestId=${encodeURIComponent(notification.requestId)}`
      : '/ict-office/requests';
    navigate(requestPath);
  };

  const notificationSettings = getICTOfficerSettings().notifications;
  const visibleNotifications = notifications.filter((n) => {
    if (!ICT_NOTIFICATION_TYPES.has(n.eventType)) return false;
    if (n.eventType === 'NEW_CLEARANCE_REQUEST' || n.eventType === 'NEW_ICT_CLEARANCE_REQUEST') return notificationSettings.newClearanceRequest;
    if (n.eventType === 'CLEARANCE_RESUBMITTED') return notificationSettings.requestResubmitted;
    if (n.eventType === 'PENDING_CLEARANCE_REMINDER' || n.eventType === 'PENDING_REVIEW_REMINDER') return notificationSettings.pendingReminder;
    return notificationSettings.actionRequired !== false;
  });

  const filteredNotifications = visibleNotifications.filter((n) => {
    const matchesCategory = activeFilter === 'All' || activeFilter === 'Clearance Updates';
    const matchesTab = activeTab === 'all' || (activeTab === 'unread' && !n.isRead);
    return matchesCategory && matchesTab;
  });

  const unreadCount = visibleNotifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type) => {
    switch (getNotificationType({ type })) {
      case 'NEW_CLEARANCE_REQUEST':
        return <Bell className="text-blue-600" size={20} />;
      case 'CLEARANCE_RESUBMITTED':
        return <RotateCcw className="text-amber-600" size={20} />;
      case 'PENDING_CLEARANCE_REMINDER':
      case 'PENDING_REVIEW_REMINDER':
        return <Clock className="text-orange-500" size={20} />;
      case 'CLEARANCE_APPROVED':
      case 'ICT_CLEARANCE_APPROVED':
        return <CheckCircle className="text-emerald-600" size={20} />;
      default:
        return <MessageSquare className="text-slate-600" size={20} />;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">🔔 ICT Officer Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">Employee clearance requests that require ICT action.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 text-sm font-medium shadow-sm"
          >
            <CheckCheck size={16} /> Mark All as Read
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="text-blue-600" size={18} />
          <h2 className="text-sm font-bold text-slate-800">ICT Clearance Updates</h2>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'unread' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter size={14} /> Filter:
          </span>
          {['All', 'Clearance Updates'].map((category) => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-3 py-1 text-xs rounded-full font-medium border transition ${
                activeFilter === category
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-8 rounded-xl text-center border text-slate-500">
            Loading notifications from the database...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white p-8 rounded-xl text-center border text-slate-500">
            No notifications found in this category.
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                !n.isRead
                  ? n.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-blue-50/60 border-blue-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-white shadow-sm border mt-0.5">
                  {getNotificationIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 text-sm">{n.type}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Clearance Updates
                    </span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                    <span>Employee: <strong>{n.employeeName}</strong> {n.employeeId ? `(${n.employeeId})` : ''}</span>
                    <span>•</span>
                    {n.requestId && <><span>Request: <strong>{n.requestId}</strong></span><span>•</span></>}
                    <span>{n.date} at {n.time}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0">
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                    title="Mark as Read"
                  >
                    <CheckCheck size={18} />
                  </button>
                )}
                <button
                  onClick={() => handleViewRequest(n)}
                  className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-medium"
                >
                  <Eye size={14} /> {n.actionText}
                </button>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ICTNotifications;