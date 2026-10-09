import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Bus,
  Check,
  CheckCheck,
  ClipboardList,
  RotateCcw,
  Wrench,
} from 'lucide-react';

const API_URL = 'http://localhost:3000/api/transport/notifications';

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const formatTimeAgo = (value) => {
  if (!value) return 'Just now';
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return 'Just now';
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (elapsedSeconds < 60) return 'Just now';
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(createdAt).toLocaleDateString();
};

const notificationStyle = (type) => {
  if (type.includes('APPROVED')) return { icon: Check, color: 'bg-emerald-50 text-emerald-700' };
  if (type.includes('RETURNED')) return { icon: RotateCcw, color: 'bg-rose-50 text-rose-700' };
  if (type.includes('VEHICLE_ASSIGNMENT')) return { icon: Bus, color: 'bg-sky-50 text-sky-700' };
  if (type.includes('VEHICLE_RETURNED')) return { icon: RotateCcw, color: 'bg-cyan-50 text-cyan-700' };
  if (type.includes('MAINTENANCE')) return { icon: Wrench, color: 'bg-amber-50 text-amber-700' };
  if (type.includes('REMINDER')) return { icon: Bell, color: 'bg-orange-50 text-orange-700' };
  if (type.includes('RESUBMISSION') || type.includes('RESUBMITTED')) return { icon: RotateCcw, color: 'bg-indigo-50 text-indigo-700' };
  return { icon: ClipboardList, color: 'bg-blue-50 text-blue-700' };
};

export default function TransportNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const loadNotifications = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(API_URL, { ...authConfig(), signal: controller.signal });
        setNotifications(response.data.notifications || []);
        window.dispatchEvent(new Event('transport-notifications-updated'));
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.response?.data?.message || 'Unable to load Transport notifications.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadNotifications();
    return () => controller.abort();
  }, [refreshKey]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const visibleNotifications = activeTab === 'Unread'
    ? notifications.filter((notification) => !notification.isRead)
    : notifications;

  const markRead = async (notification) => {
    if (notification.isRead) return;
    setUpdatingId(String(notification._id));
    try {
      await axios.patch(`${API_URL}/${notification._id}/read`, {}, authConfig());
      setNotifications((current) => current.map((item) => String(item._id) === String(notification._id) ? { ...item, isRead: true } : item));
      window.dispatchEvent(new Event('transport-notifications-updated'));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update the notification.');
    } finally {
      setUpdatingId('');
    }
  };

  const markAllRead = async () => {
    setUpdatingId('all');
    try {
      await axios.patch(`${API_URL}/mark-all-read`, {}, authConfig());
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      window.dispatchEvent(new Event('transport-notifications-updated'));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to mark notifications as read.');
    } finally {
      setUpdatingId('');
    }
  };

  const openNotification = async (notification) => {
    await markRead(notification);
    const target = notification.actionLink && notification.actionLink !== '#'
      ? notification.actionLink
      : notification.type.includes('VEHICLE')
        ? '/transport-office/assigned-vehicles'
        : notification.type.includes('APPROVED') || notification.type.includes('RETURNED')
          ? '/transport-office/history'
          : '/transport-office/requests';
    navigate(target);
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">Transport Office</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-xs text-slate-500">Clearance requests, decisions, and vehicle activity.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} className="self-start rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Refresh</button>
      </header>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Transport Activity</h2>
            <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">{unreadCount} unread</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md bg-slate-100 p-1" role="tablist" aria-label="Notification filter">
              {['All', 'Unread'].map((tab) => (
                <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded px-3 py-1.5 text-xs font-semibold ${activeTab === tab ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600'}`}>{tab}</button>
              ))}
            </div>
            <button type="button" onClick={markAllRead} disabled={!unreadCount || updatingId === 'all'} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck size={14} />Mark all as read</button>
          </div>
        </div>

        {error && <p role="alert" className="m-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-xs text-slate-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />Loading Transport notifications...</div>
          ) : visibleNotifications.length === 0 ? (
            <p className="px-4 py-12 text-center text-xs text-slate-500">{activeTab === 'Unread' ? 'You are all caught up.' : 'No Transport notifications yet.'}</p>
          ) : visibleNotifications.map((notification) => {
            const { icon: Icon, color } = notificationStyle(notification.type || '');
            return (
              <article key={notification._id} className={`flex items-start gap-3 px-4 py-4 transition-colors hover:bg-slate-50 ${notification.isRead ? 'bg-white' : 'bg-teal-50/40'}`}>
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${color}`}><Icon size={17} /></span>
                <button type="button" onClick={() => openNotification(notification)} disabled={updatingId === String(notification._id)} className="min-w-0 flex-1 text-left disabled:opacity-60">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{notification.title}</span>
                    {!notification.isRead && <span className="h-2 w-2 rounded-full bg-teal-600" aria-label="Unread" />}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{notification.message}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400">
                    {notification.employeeId && <span>Employee ID: {notification.employeeId}</span>}
                    {notification.relatedRequestId && <span>Request: {notification.relatedRequestId}</span>}
                    <span>{formatTimeAgo(notification.createdAt)}</span>
                  </span>
                </button>
                <span className="hidden shrink-0 text-[10px] font-semibold text-teal-700 sm:inline">{notification.actionText || 'View'}</span>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}