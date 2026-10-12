import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { deleteNotification as deleteNotificationRequest, fetchAdminContactMessage, fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead, replyToAdminContactMessage, sendNotificationReply } from '../../until/NotificationHelper';
import { 
  Bell, Check, ChevronRight, FilePlus, CheckCircle2, Clock, 
  RotateCcw, Users, User, UserX, ShieldCheck, Menu, UserPlus,
  Building2, Settings2, ShieldAlert, ClipboardCheck,
  Trash2, Search, CalendarDays, MessageCircle, Send, X, CheckCheck,
  Square, CheckSquare
} from 'lucide-react';
import EmployeeNavbar from '../employeedashboared/employeenavbar';
import EmployeeSidebar from '../employeedashboared/employeesidbar';
import { useOptionalAdminLanguage } from '../admindashboared/AdminLanguage';
import { useEmployeeLanguage } from '../employeedashboared/EmployeeLanguage';
import { subscribeToNotifications } from '../../until/notificationSocket';

const HR_CLEARANCE_NOTIFICATION_TYPES = new Set([
  'NEW_CLEARANCE_REQUEST',
  'NEW_REQUEST',
  'REQUEST_SUBMITTED',
  'REQUEST_ASSIGNED',
  'CLEARANCE_REQUEST',
  'CLEARANCE_RESUBMITTED',
  'CLEARANCE_REQUEST_RETURNED',
  'CLEARANCE_IN_PROGRESS',
  'CLEARANCE_PROGRESS_UPDATED',
  'CLEARANCE_UPDATED',
  'CLEARANCE_INFORMATION_UPDATED',
  'CLEARANCE_INFO_UPDATED',
  'PENDING_REMINDER',
  'PENDING_CLEARANCE_REMINDER',
  'CLEARANCE_FOLLOW_UP',
  'dept_completed',
  'FINANCE_APPROVED',
  'FINANCE_RETURNED',
  'ICT_CLEARANCE_APPROVED',
  'ICT_CLEARANCE_RETURNED',
  'ready_review',
  'certificate_available',
  'final_completed',
  'CERTIFICATE_ISSUED',
  'HR_CONTACT_INQUIRY',
]);

const getHrNotificationCategory = (item) => {
  const searchable = `${item.type || ''} ${item.title || ''} ${item.message || ''}`.toUpperCase();
  if (/CONTACT|INQUIRY|ENQUIRY/.test(searchable)) return 'Contact Inquiries';
  if (/SYSTEM|ALERT/.test(searchable)) return 'System Alerts';
  if (item.requestId || HR_CLEARANCE_NOTIFICATION_TYPES.has(item.type)) return 'Clearance Updates';
  return 'System Alerts';
};

const getHrNotificationStatus = (item) => {
  const searchable = `${item.type || ''} ${item.title || ''} ${item.message || ''} ${item.status || ''}`.toUpperCase();
  if (item.status === 'Replied') return 'Replied';
  if (/RETURN|REJECT/.test(searchable)) return 'Returned';
  if (/APPROV|COMPLET|ISSUED|CERTIFICATE/.test(searchable)) return 'Completed';
  return 'Pending';
};

const toLocalDateInputValue = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export default function NotificationsPage() {
  const { t: adminT } = useOptionalAdminLanguage();
  const { t: employeeT } = useEmployeeLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isEmployeeRoute = pathname.startsWith('/employee/');
  const isAdminRoute = pathname.startsWith('/admin/');
  const isHrRoute = pathname.startsWith('/hr-office/');
  const t = isEmployeeRoute ? employeeT : adminT;
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [categoryTab, setCategoryTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);
  const [replyNotification, setReplyNotification] = useState(null);
  const [replyContactMessage, setReplyContactMessage] = useState(null);
  const [replyContextLoading, setReplyContextLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const displayName = user?.fullName || user?.name || (isAdminRoute ? 'System Admin' : 'User');
  const displayRole = typeof user?.role === 'object' ? user.role.name : user?.role;
  const displayEmail = user?.email || '';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'US';

  useEffect(() => {
    let active = true;
    fetchNotifications()
      .then((items) => {
        if (!active) return;
        const notificationItems = Array.isArray(items) ? items : [];
        const visibleItems = isEmployeeRoute || isAdminRoute || isHrRoute
          ? notificationItems
          : notificationItems.filter((item) => HR_CLEARANCE_NOTIFICATION_TYPES.has(item.type));
        setNotifications(visibleItems.map((item) => ({
          ...item,
          id: item._id || item.id,
          name: item.targetName || item.name || 'Employee',
          requestId: item.relatedRequestId || item.clearanceRequestId || item.requestId || item.clearanceRequest?.requestNumber || '',
          employeeName: item.employeeName || item.targetName || item.clearanceRequest?.employeeName || 'Employee',
          employeeId: item.employeeId || item.clearanceRequest?.employeeId || '',
          text: item.message || item.text || '',
          action: item.actionText || item.action || 'View Details',
          createdAt: item.createdAt,
          time: item.createdAt ? new Date(item.createdAt).toLocaleString() : item.time || '-',
          unread: item.isRead === undefined ? (item.status ? item.status !== 'Read' : item.unread !== false) : !item.isRead,
        })));
      })
      .catch(() => {
        if (active) setLoadError('Unable to load notifications.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isAdminRoute, isEmployeeRoute, isHrRoute]);

  useEffect(() => {
    if (!isEmployeeRoute && !isHrRoute && !isAdminRoute) return undefined;
    return subscribeToNotifications((incoming) => {
      if (String(incoming.recipientId || '') !== String(user?._id || user?.id || '')) return;
      const item = {
        ...incoming,
        id: incoming._id || incoming.id,
        name: incoming.targetName || (isHrRoute ? 'Employee' : 'HR Officer'),
        requestId: incoming.relatedRequestId || incoming.clearanceRequestId || '',
        employeeName: isHrRoute ? incoming.targetName || 'Employee' : user?.fullName || user?.name || 'Employee',
        employeeId: incoming.employeeId || '',
        text: incoming.message || '',
        action: incoming.actionText || 'View Details',
        createdAt: incoming.createdAt,
        time: incoming.createdAt ? new Date(incoming.createdAt).toLocaleString() : 'Just now',
        unread: true,
      };
      setNotifications((current) => [item, ...current.filter((existing) => String(existing.id) !== String(item.id))]);
      window.dispatchEvent(new Event('notifications-updated'));
    });
  }, [isAdminRoute, isEmployeeRoute, isHrRoute, user?._id, user?.id, user?.fullName, user?.name]);

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch {
      setLoadError('Unable to update notification status.');
    }
  };

  const actionFor = (item) => {
    if (isEmployeeRoute) return '/employee/my-clearance';
    if (isAdminRoute) return item.actionLink && item.actionLink !== '#' ? item.actionLink : '/admin';
    if (item.requestId) return `/hr-office/clearance-requests?requestId=${encodeURIComponent(item.requestId)}`;
    if (item.actionLink && item.actionLink !== '#') return item.actionLink;
    if (['ready_review', 'final_completed', 'certificate_available', 'CERTIFICATE_ISSUED'].includes(item.type)) return item.type === 'certificate_available' || item.type === 'CERTIFICATE_ISSUED' ? '/hr-office/certificates' : '/hr-office/final-hr-clearance';
    if (item.type === 'pending') return '/hr-office/clearance-requests?status=In%20Progress';
    return '/hr-office/clearance-requests';
  };

  const openNotification = async (item) => {
    if (item.unread && item.id) {
      try {
        await markNotificationAsRead(item.id);
        setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, unread: false } : notification));
        window.dispatchEvent(new Event('notifications-updated'));
      } catch {
        setLoadError('Unable to update notification status.');
      }
    }
    navigate(actionFor(item));
  };

  const deleteNotification = async (item) => {
    if (!item.id) {
      setLoadError('Unable to delete notification: notification id is missing.');
      return;
    }
    try {
      setLoadError('');
      await deleteNotificationRequest(item.id);
      setNotifications((current) => current.filter((notification) => notification.id !== item.id));
      setSelectedIds((current) => current.filter((id) => id !== String(item.id)));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (error) {
      setLoadError(error.response?.data?.message || 'Unable to delete notification.');
    }
  };

  const unreadNotifications = notifications.filter((item) => item.unread);
  const filteredNotifications = notifications.filter((item) => {
    if (!isHrRoute) return true;
    if (categoryTab !== 'All' && getHrNotificationCategory(item) !== categoryTab) return false;
    if (statusFilter !== 'All' && getHrNotificationStatus(item) !== statusFilter) return false;
    const query = searchQuery.trim().toLowerCase();
    if (query && ![
      item.title,
      item.message,
      item.employeeName,
      item.employeeId,
      item.requestId,
    ].some((value) => String(value || '').toLowerCase().includes(query))) return false;
    if (dateFrom || dateTo) {
      const itemDate = toLocalDateInputValue(item.createdAt);
      if (!itemDate || (dateFrom && itemDate < dateFrom) || (dateTo && itemDate > dateTo)) return false;
    }
    return true;
  });
  const visibleNotifications = (activeTab === 'Unread'
    ? filteredNotifications.filter((item) => item.unread)
    : filteredNotifications);
  const countByType = (type) => unreadNotifications.filter((item) => item.type === type).length;
  const selectedNotifications = notifications.filter((item) => selectedIds.includes(String(item.id)));
  const allVisibleSelected = visibleNotifications.length > 0
    && visibleNotifications.every((item) => selectedIds.includes(String(item.id)));

  const toggleSelected = (id) => {
    const normalizedId = String(id);
    setSelectedIds((current) => current.includes(normalizedId)
      ? current.filter((selectedId) => selectedId !== normalizedId)
      : [...current, normalizedId]);
  };

  const toggleVisibleSelection = () => {
    const visibleIds = visibleNotifications.map((item) => String(item.id));
    setSelectedIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const markSelectedAsRead = async () => {
    const unreadSelected = selectedNotifications.filter((item) => item.unread && item.id);
    if (!unreadSelected.length) return;
    setBulkUpdating(true);
    setLoadError('');
    const results = await Promise.allSettled(unreadSelected.map((item) => markNotificationAsRead(item.id)));
    const successfulIds = new Set(unreadSelected.filter((_, index) => results[index].status === 'fulfilled').map((item) => String(item.id)));
    setNotifications((current) => current.map((item) => successfulIds.has(String(item.id)) ? { ...item, unread: false } : item));
    if (successfulIds.size !== unreadSelected.length) setLoadError('Some selected notifications could not be marked as read.');
    setSelectedIds((current) => current.filter((id) => !successfulIds.has(id)));
    if (successfulIds.size) window.dispatchEvent(new Event('notifications-updated'));
    setBulkUpdating(false);
  };

  const deleteSelectedNotifications = async () => {
    const deletableSelected = selectedNotifications.filter((item) => item.id);
    if (!deletableSelected.length) return;
    setBulkUpdating(true);
    setLoadError('');
    const results = await Promise.allSettled(deletableSelected.map((item) => deleteNotificationRequest(item.id)));
    const deletedIds = new Set(deletableSelected.filter((_, index) => results[index].status === 'fulfilled').map((item) => String(item.id)));
    setNotifications((current) => current.filter((item) => !deletedIds.has(String(item.id))));
    setSelectedIds((current) => current.filter((id) => !deletedIds.has(id)));
    if (deletedIds.size !== deletableSelected.length) setLoadError('Some selected notifications could not be deleted.');
    if (deletedIds.size) window.dispatchEvent(new Event('notifications-updated'));
    setBulkUpdating(false);
  };

  const openAdminContactReply = async (notification) => {
    if (!notification.relatedContactMessageId) {
      setLoadError('Unable to load the original contact message.');
      return;
    }
    setReplyNotification(notification);
    setReplyContactMessage(null);
    setReplyMessage('');
    setReplyError('');
    setReplyContextLoading(true);
    try {
      const contactMessage = await fetchAdminContactMessage(notification.relatedContactMessageId);
      setReplyContactMessage(contactMessage);
    } catch (error) {
      setReplyError(error.response?.data?.message || 'Unable to load the original contact message.');
    } finally {
      setReplyContextLoading(false);
    }
  };

  const submitQuickReply = async (event) => {
    event.preventDefault();
    if (!replyNotification?.id || !replyMessage.trim()) return;
    setReplySending(true);
    setReplyError('');
    try {
    const isAdminContactReply = isAdminRoute && replyNotification.type === 'ADMIN_CONTACT_INQUIRY';
    const response = isAdminContactReply
      ? await replyToAdminContactMessage(replyNotification.relatedContactMessageId, replyMessage.trim())
      : await sendNotificationReply(replyNotification.id, replyMessage.trim());
    setNotifications((current) => current.map((item) => String(item.id) === String(replyNotification.id)
      ? { ...item, status: 'Replied', replyMessage: replyMessage.trim(), repliedAt: response.source?.repliedAt || response.data?.repliedAt || new Date().toISOString() }
      : item));
    setReplyNotification(null);
    setReplyContactMessage(null);
    setReplyMessage('');
    window.dispatchEvent(new Event('notifications-updated'));
    } catch (error) {
      setReplyError(error.response?.data?.message || 'Unable to send reply.');
    } finally {
      setReplySending(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'new_request':
      case 'NEW_CLEARANCE_REQUEST':
      case 'NEW_REQUEST':
      case 'REQUEST_SUBMITTED':
        return <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><FilePlus size={18} /></div>;
      case 'dept_completed':
      case 'FINANCE_APPROVED':
      case 'CLEARANCE_IN_PROGRESS':
      case 'CLEARANCE_PROGRESS_UPDATED':
      case 'CLEARANCE_UPDATED':
        return <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 size={18} /></div>;
      case 'pending':
        return <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Clock size={18} /></div>;
      case 'returned':
      case 'CLEARANCE_REQUEST_RETURNED':
      case 'FINANCE_RETURNED':
        return <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0"><RotateCcw size={18} /></div>;
      case 'ready_review':
      case 'certificate_available':
        return <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><Users size={18} /></div>;
      case 'resignation':
        return <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0"><User size={18} /></div>;
      case 'dismissed':
        return <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0"><UserX size={18} /></div>;
      case 'final_completed':
      case 'CERTIFICATE_ISSUED':
        return <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><ShieldCheck size={18} /></div>;
      default:
        return <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Bell size={18} /></div>;
    }
  };

  const getTitleColor = (type) => {
    switch (type) {
      case 'new_request':
      case 'NEW_CLEARANCE_REQUEST': return 'text-blue-600';
      case 'NEW_REQUEST':
      case 'REQUEST_SUBMITTED': return 'text-blue-600';
      case 'dept_completed':
      case 'FINANCE_APPROVED':
      case 'CLEARANCE_IN_PROGRESS': return 'text-emerald-600';
      case 'CLEARANCE_PROGRESS_UPDATED':
      case 'CLEARANCE_UPDATED': return 'text-emerald-600';
      case 'pending': return 'text-amber-600';
      case 'returned':
      case 'CLEARANCE_REQUEST_RETURNED':
      case 'FINANCE_RETURNED': return 'text-red-500';
      case 'ready_review':
      case 'certificate_available': return 'text-purple-600';
      case 'resignation': return 'text-teal-600';
      case 'dismissed': return 'text-rose-500';
      case 'final_completed':
      case 'CERTIFICATE_ISSUED': return 'text-emerald-600';
      default: return 'text-slate-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      {isEmployeeRoute && <><div className="hidden lg:block"><EmployeeSidebar /></div>      {menuOpen && <><button type="button" aria-label={t('Close menu')} className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} /><div className="relative z-50 lg:hidden"><EmployeeSidebar onNavigate={() => setMenuOpen(false)} /></div></>}<EmployeeNavbar onMenuClick={() => setMenuOpen(true)} /></>}
      
      {/* TOP NAVBAR */}
      {!isEmployeeRoute && <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button className="text-slate-500 hover:text-slate-700">
            <Menu size={20} />
          </button>
          <h1 className="text-base font-bold text-slate-800">{t('Notifications')}</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative cursor-pointer">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{unreadNotifications.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
              {initials}
            </div>
            <div className="text-left leading-tight">
              <p className="font-semibold text-xs text-slate-800">{displayName}</p>
              <p className="text-[10px] text-slate-400">{displayRole || displayEmail}</p>
            </div>
          </div>
        </div>
      </header>}

      {/* MAIN CONTENT AREA */}
      <main className={`max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 ${isEmployeeRoute ? 'lg:ml-72' : ''}`}>
        
        {/* LEFT SECTION: NOTIFICATION LIST */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">{t('Notifications')}</h2>
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadNotifications.length} {t('unread')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-slate-100 p-1">
                {['All', 'Unread'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${activeTab === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}
                  >
                    {t(tab)}{tab === 'Unread' ? ` (${unreadNotifications.length})` : ''}
                  </button>
                ))}
              </div>
              <button 
                onClick={markAllAsRead}
                disabled={!unreadNotifications.length}
                className="flex items-center space-x-1.5 text-blue-600 border border-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={14} />
                <span>{t('Mark all as read')}</span>
              </button>
            </div>
            </div>

            {isHrRoute && <>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3" role="tablist" aria-label="Notification category">
                {['All', 'Clearance Updates', 'Contact Inquiries', 'System Alerts'].map((category) => {
                  const categoryCount = category === 'All'
                    ? notifications.length
                    : notifications.filter((item) => getHrNotificationCategory(item) === category).length;
                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={categoryTab === category}
                      onClick={() => setCategoryTab(category)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${categoryTab === category ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {category} <span className={categoryTab === category ? 'text-teal-100' : 'text-slate-400'}>({categoryCount})</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <label className="relative sm:col-span-2">
                  <span className="sr-only">Search notifications</span>
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search employee, employee ID, request ID, or message"
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <CalendarDays size={15} className="shrink-0 text-slate-400" />
                  <span className="text-xs text-slate-500">From</span>
                  <input aria-label="From date" type="date" max={dateTo || undefined} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="min-w-0 flex-1 text-xs text-slate-700 outline-none" />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <CalendarDays size={15} className="shrink-0 text-slate-400" />
                  <span className="text-xs text-slate-500">To</span>
                  <input aria-label="To date" type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="min-w-0 flex-1 text-xs text-slate-700 outline-none" />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2">
                  <span className="text-xs font-medium text-slate-500">Status / priority</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="ml-auto rounded bg-transparent text-xs font-semibold text-slate-700 outline-none">
                    {['All', 'Returned', 'Pending', 'Completed', 'Replied'].map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </div>

              {(selectedIds.length > 0 || visibleNotifications.length > 0) && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={toggleVisibleSelection} disabled={!visibleNotifications.length} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-teal-700 disabled:opacity-50">
                  {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  {allVisibleSelected ? 'Deselect visible' : 'Select visible'}
                </button>
                {selectedIds.length > 0 && <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs text-slate-500">{selectedIds.length} selected</span>
                  <button type="button" onClick={markSelectedAsRead} disabled={bulkUpdating || !selectedNotifications.some((item) => item.unread)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <CheckCheck size={14} />Mark selected as read
                  </button>
                  <button type="button" onClick={deleteSelectedNotifications} disabled={bulkUpdating} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                    <Trash2 size={14} />Delete selected
                  </button>
                </div>}
              </div>}
            </>}
          </div>

          <div className="space-y-3">
            {loading ? <p className="rounded-xl bg-white p-8 text-center text-xs text-slate-400">{t('Loading notifications...')}</p> : loadError ? <p role="alert" className="rounded-xl bg-white p-8 text-center text-xs text-red-500">{t(loadError)}</p> : visibleNotifications.length === 0 ? <p className="rounded-xl bg-white p-8 text-center text-xs text-slate-400">{t('No notifications found.')}</p> : visibleNotifications.map((item) => (
              <div 
                key={item.id} 
                className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between gap-3 relative transition-colors ${
                  item.unread ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                <div className="flex min-w-0 items-start space-x-3.5">
                  {isHrRoute && <input type="checkbox" checked={selectedIds.includes(String(item.id))} onChange={() => toggleSelected(item.id)} aria-label={`Select ${item.title}`} className="mt-3 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-teal-600" />}
                  {getIcon(item.type)}
                  <div className="min-w-0 space-y-0.5 text-xs">
                    <h3 className={`font-semibold text-sm ${getTitleColor(item.type)}`}>
                      {t(item.title)}
                    </h3>
                    {!isEmployeeRoute && (item.requestId || item.employeeName) && (
                      <p className="text-[11px] font-medium text-slate-500">
                        {item.requestId && `${t('Request')}: ${item.requestId}`}
                        {item.requestId && item.employeeName && ' | '}
                        {item.employeeName && `${t('Employee')}: ${item.employeeName}`}
                        {item.employeeId && ` | ID: ${item.employeeId}`}
                      </p>
                    )}
                    <p className="text-slate-600 leading-relaxed">{t(item.message || item.text || '')}</p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button type="button" onClick={() => openNotification(item)} className="inline-block text-blue-600 font-medium hover:underline text-xs">
                        {t(item.action)}
                      </button>
                      {isHrRoute && item.status === 'Replied' && <p className="mt-1 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-900"><span className="font-semibold">HR reply:</span> {item.replyMessage}{item.repliedAt && <span className="mt-1 block text-[10px] text-teal-700">{new Date(item.repliedAt).toLocaleString()}</span>}</p>}
                      {isHrRoute && item.type !== 'HR_CONTACT_INQUIRY' && (item.requestId || item.employeeId) && item.status !== 'Replied' && <button type="button" onClick={() => { setReplyNotification(item); setReplyMessage(''); setReplyError(''); }} className="inline-flex items-center gap-1.5 text-teal-700 font-semibold hover:underline text-xs">
                        <MessageCircle size={14} />Quick Reply
                      </button>}
                      {isAdminRoute && item.type === 'ADMIN_CONTACT_INQUIRY' && item.status !== 'Replied' && <button type="button" onClick={() => openAdminContactReply(item)} className="inline-flex items-center gap-1.5 text-teal-700 font-semibold hover:underline text-xs">
                        <MessageCircle size={14} />Quick Reply
                      </button>}
                      {isAdminRoute && item.type === 'ADMIN_CONTACT_INQUIRY' && item.status === 'Replied' && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">Replied</span>}
                      {isHrRoute && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getHrNotificationStatus(item) === 'Returned' ? 'bg-red-50 text-red-700' : getHrNotificationStatus(item) === 'Completed' ? 'bg-emerald-50 text-emerald-700' : getHrNotificationStatus(item) === 'Replied' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>{getHrNotificationStatus(item)}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-slate-400 shrink-0">
                  <span>{item.time}</span>
                  {item.unread && (
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteNotification(item)}
                    title={t('Delete notification')}
                    aria-label={t('Delete notification')}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SECTION: SUMMARY & QUICK ACTIONS */}
        <div className="col-span-12 space-y-6 lg:col-span-4">
          
          {/* Unread Summary Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm mb-2">{t('Unread Summary')}</h3>
            
            <div className="space-y-2 text-xs">
              {isAdminRoute ? <>
                <SummaryRow icon={<UserPlus size={14} className="text-blue-600" />} label="User & Account Events" count={unreadNotifications.filter((item) => item.type === 'SYSTEM_USER_CREATED' || item.type === 'SYSTEM_ACCOUNT_DISABLED').length} color="bg-blue-50 text-blue-600" />
                <SummaryRow icon={<Building2 size={14} className="text-emerald-600" />} label="Organization Changes" count={unreadNotifications.filter((item) => item.type.includes('DEPARTMENT')).length} color="bg-emerald-50 text-emerald-600" />
                <SummaryRow icon={<Settings2 size={14} className="text-amber-600" />} label="Settings & Office Configuration" count={unreadNotifications.filter((item) => item.type.includes('SETTINGS') || item.type.includes('POSITION')).length} color="bg-amber-50 text-amber-600" />
                <SummaryRow icon={<ShieldAlert size={14} className="text-red-500" />} label="Security Events" count={unreadNotifications.filter((item) => item.type.includes('PASSWORD') || item.type.includes('SECURITY') || item.type.includes('ERROR')).length} color="bg-red-50 text-red-600" />
                <SummaryRow icon={<MessageCircle size={14} className="text-amber-600" />} label="Contact Inquiries" count={countByType('ADMIN_CONTACT_INQUIRY')} color="bg-amber-50 text-amber-600" />
                <SummaryRow icon={<ClipboardCheck size={14} className="text-purple-600" />} label="Audit Events" count={countByType('SYSTEM_AUDIT_EVENT')} color="bg-purple-50 text-purple-600" />
              </> : isHrRoute ? <>
                <SummaryRow icon={<FilePlus size={14} className="text-blue-600" />} label="Clearance Updates" count={unreadNotifications.filter((item) => getHrNotificationCategory(item) === 'Clearance Updates').length} color="bg-blue-50 text-blue-600" />
                <SummaryRow icon={<MessageCircle size={14} className="text-amber-600" />} label="Contact Inquiries" count={unreadNotifications.filter((item) => getHrNotificationCategory(item) === 'Contact Inquiries').length} color="bg-amber-50 text-amber-600" />
                <SummaryRow icon={<ShieldAlert size={14} className="text-purple-600" />} label="System Alerts" count={unreadNotifications.filter((item) => getHrNotificationCategory(item) === 'System Alerts').length} color="bg-purple-50 text-purple-600" />
                <SummaryRow icon={<RotateCcw size={14} className="text-red-500" />} label="Returned / High Priority" count={unreadNotifications.filter((item) => getHrNotificationStatus(item) === 'Returned').length} color="bg-red-50 text-red-600" />
                <SummaryRow icon={<Clock size={14} className="text-amber-600" />} label="Pending" count={unreadNotifications.filter((item) => getHrNotificationStatus(item) === 'Pending').length} color="bg-amber-50 text-amber-600" />
              </> : <>
                <SummaryRow icon={<FilePlus size={14} className="text-blue-600" />} label={t('New Requests')} count={countByType('new_request')} color="bg-blue-50 text-blue-600" />
                <SummaryRow icon={<CheckCircle2 size={14} className="text-emerald-600" />} label={t('Department Completed')} count={countByType('dept_completed')} color="bg-emerald-50 text-emerald-600" />
                <SummaryRow icon={<Clock size={14} className="text-amber-600" />} label={t('Pending')} count={countByType('pending')} color="bg-amber-50 text-amber-600" />
                <SummaryRow icon={<RotateCcw size={14} className="text-red-500" />} label={t('Returned')} count={countByType('returned')} color="bg-red-50 text-red-600" />
                <SummaryRow icon={<Users size={14} className="text-purple-600" />} label={t('Ready for Final Review')} count={countByType('ready_review')} color="bg-purple-50 text-purple-600" />
              </>}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
              <span>{t('Total Unread')}</span>
              <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md">{unreadNotifications.length}</span>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm mb-2">{t('Quick Actions')}</h3>
            
            <div className="space-y-1">
              {isAdminRoute ? <>
                <QuickActionItem to="/admin/users" icon={<UserPlus size={16} className="text-blue-600" />} title="Manage Users" sub="View system accounts" />
                <QuickActionItem to="/admin/departments" icon={<Building2 size={16} className="text-blue-600" />} title="Departments" sub="Manage organization units" />
                <QuickActionItem to="/admin/system-settings" icon={<Settings2 size={16} className="text-blue-600" />} title="System Settings" sub="Review configuration" />
                <QuickActionItem to="/admin/audit-logs" icon={<ClipboardCheck size={16} className="text-blue-600" />} title="Audit Logs" sub="Review system activity" />
              </> : <>
                <QuickActionItem to={isEmployeeRoute ? '/employee/my-clearance' : '/hr-office/clearance-requests'} icon={<FilePlus size={16} className="text-blue-600" />} title={t('Clearance Requests')} sub={t('View all clearance requests')} />
                <QuickActionItem to={isEmployeeRoute ? '/employee/my-clearance#status' : '/hr-office/clearance-requests?status=In%20Progress'} icon={<Clock size={16} className="text-blue-600" />} title={t('Pending Follow Ups')} sub={t('Follow up pending clearances')} />
                <QuickActionItem to={isEmployeeRoute ? '/employee/my-clearance#history' : '/hr-office/reports'} icon={<Users size={16} className="text-blue-600" />} title={t('Reports')} sub={t('View clearance reports')} />
                <QuickActionItem to={isEmployeeRoute ? '/employee/my-clearance#request' : '/hr-office/add-clearance'} icon={<CheckCircle2 size={16} className="text-blue-600" />} title={t('Create Clearance Request')} sub={t(isEmployeeRoute ? 'Submit your clearance request' : 'Create request for an employee')} />
              </>}
            </div>
          </div>

        </div>

      </main>
      {replyNotification && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !replySending) { setReplyNotification(null); setReplyContactMessage(null); } }}>
        <section role="dialog" aria-modal="true" aria-labelledby="hr-reply-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="hr-reply-title" className="text-base font-bold text-slate-900">{isAdminRoute ? 'Reply to employee inquiry' : 'Reply to employee'}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {(replyContactMessage?.fullName || replyNotification.employeeName || 'Employee')}
                {(replyContactMessage?.employeeId || replyNotification.employeeId) ? ` · ID: ${replyContactMessage?.employeeId || replyNotification.employeeId}` : ''}
                {replyNotification.requestId ? ` · Request: ${replyNotification.requestId}` : ''}
              </p>
            </div>
            <button type="button" aria-label="Close reply dialog" disabled={replySending} onClick={() => { setReplyNotification(null); setReplyContactMessage(null); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X size={18} /></button>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {replyContextLoading ? <p className="text-xs text-slate-500">Loading original message...</p> : <>
              {replyContactMessage && <p className="mb-1 text-xs text-slate-500">{replyContactMessage.category} · {replyContactMessage.subject}</p>}
              <p className="text-xs font-semibold text-slate-700">{replyContactMessage ? 'Original message' : replyNotification.title || 'Original message'}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{replyContactMessage?.message || replyNotification.message || replyNotification.text || 'No message content was provided.'}</p>
            </>}
          </div>
          <form onSubmit={submitQuickReply} className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-slate-700" htmlFor="hr-quick-reply">Reply message</label>
            <textarea id="hr-quick-reply" required minLength={1} maxLength={2000} rows={5} value={replyMessage} onChange={(event) => setReplyMessage(event.target.value)} placeholder="Write a reply for the employee..." className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">{replyMessage.length}/2000</span>
              <div className="flex gap-2">
                <button type="button" disabled={replySending} onClick={() => { setReplyNotification(null); setReplyContactMessage(null); }} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={replySending || replyContextLoading || (isAdminRoute && !replyContactMessage) || !replyMessage.trim()} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
                  <Send size={14} />{replySending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
            {replyError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{replyError}</p>}
          </form>
        </section>
      </div>}
    </div>
  );
}

// HELPER COMPONENTS

function SummaryRow({ icon, label, count, color }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center space-x-2.5 text-slate-600">
        <div className="p-1 rounded bg-slate-50">{icon}</div>
        <span>{label}</span>
      </div>
      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${color}`}>
        {count}
      </span>
    </div>
  );
}

function QuickActionItem({ icon, title, sub, to }) {
  return (
    <Link to={to} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 text-xs">{title}</h4>
          <p className="text-[10px] text-slate-400">{sub}</p>
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
    </Link>
  );
}