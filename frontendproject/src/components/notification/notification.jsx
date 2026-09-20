import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../../until/NotificationHelper';
import { 
  Bell, Check, ChevronRight, FilePlus, CheckCircle2, Clock, 
  RotateCcw, Users, User, UserX, ShieldCheck, Menu
  , Trash2
} from 'lucide-react';
import EmployeeNavbar from '../employeedashboared/employeenavbar';
import EmployeeSidebar from '../employeedashboared/employeesidbar';

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
]);

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isEmployeeRoute = pathname.startsWith('/employee/');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    let active = true;
    fetchNotifications()
      .then((items) => {
        if (!active) return;
        const notificationItems = Array.isArray(items) ? items : [];
        const visibleItems = isEmployeeRoute
          ? notificationItems
          : notificationItems.filter((item) => HR_CLEARANCE_NOTIFICATION_TYPES.has(item.type));
        setNotifications(visibleItems.map((item) => ({
          ...item,
          id: item._id || item.id,
          name: item.targetName || item.name || 'Employee',
          requestId: item.relatedRequestId || item.clearanceRequestId || item.requestId || item.clearanceRequest?.requestNumber || '',
          employeeName: item.employeeName || item.targetName || item.clearanceRequest?.employeeName || 'Employee',
          text: item.message || item.text || '',
          action: item.actionText || item.action || 'View Details',
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
  }, [isEmployeeRoute]);

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
    } catch {
      setLoadError('Unable to update notification status.');
    }
  };

  const actionFor = (item) => {
    if (isEmployeeRoute) return '/employee/my-clearance';
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
      await axios.delete(`${API_BASE_URL}/api/notifications/${item.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      setNotifications((current) => current.filter((notification) => notification.id !== item.id));
    } catch (error) {
      setLoadError(error.response?.data?.message || 'Unable to delete notification.');
    }
  };

  const unreadNotifications = notifications.filter((item) => item.unread);
  const visibleNotifications = activeTab === 'Unread' ? unreadNotifications : notifications;
  const countByType = (type) => unreadNotifications.filter((item) => item.type === type).length;

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
      {isEmployeeRoute && <><div className="hidden lg:block"><EmployeeSidebar /></div>{menuOpen && <><button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} /><div className="relative z-50 lg:hidden"><EmployeeSidebar onNavigate={() => setMenuOpen(false)} /></div></>}<EmployeeNavbar onMenuClick={() => setMenuOpen(true)} /></>}
      
      {/* TOP NAVBAR */}
      {!isEmployeeRoute && <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button className="text-slate-500 hover:text-slate-700">
            <Menu size={20} />
          </button>
          <h1 className="text-base font-bold text-slate-800">Notifications</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative cursor-pointer">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{unreadNotifications.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
              HR
            </div>
            <div className="text-left leading-tight">
              <p className="font-semibold text-xs text-slate-800">HR Officer</p>
              <p className="text-[10px] text-slate-400">hr.officer@bdu.edu.et</p>
            </div>
          </div>
        </div>
      </header>}

      {/* MAIN CONTENT AREA */}
      <main className={`max-w-7xl mx-auto p-6 grid grid-cols-12 gap-6 ${isEmployeeRoute ? 'lg:ml-72' : ''}`}>
        
        {/* LEFT SECTION: NOTIFICATION LIST */}
        <div className="col-span-8 space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">Notifications</h2>
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadNotifications.length} unread
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
                    {tab}{tab === 'Unread' ? ` (${unreadNotifications.length})` : ''}
                  </button>
                ))}
              </div>
              <button 
                onClick={markAllAsRead}
                className="flex items-center space-x-1.5 text-blue-600 border border-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <Check size={14} />
                <span>Mark all as read</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? <p className="rounded-xl bg-white p-8 text-center text-xs text-slate-400">Loading notifications...</p> : loadError ? <p className="rounded-xl bg-white p-8 text-center text-xs text-red-500">{loadError}</p> : visibleNotifications.length === 0 ? <p className="rounded-xl bg-white p-8 text-center text-xs text-slate-400">No notifications found.</p> : visibleNotifications.map((item) => (
              <div 
                key={item.id} 
                className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between relative transition-colors ${
                  item.unread ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  {getIcon(item.type)}
                  <div className="space-y-0.5 text-xs">
                    <h3 className={`font-semibold text-sm ${getTitleColor(item.type)}`}>
                      {item.title}
                    </h3>
                    {!isEmployeeRoute && (item.requestId || item.employeeName) && (
                      <p className="text-[11px] font-medium text-slate-500">
                        {item.requestId && `Request: ${item.requestId}`}
                        {item.requestId && item.employeeName && ' | '}
                        {item.employeeName && `Employee: ${item.employeeName}`}
                      </p>
                    )}
                    <p className="text-slate-600 leading-relaxed">{item.message || item.text || ''}</p>
                    <button type="button" onClick={() => openNotification(item)} className="inline-block text-blue-600 font-medium pt-1 hover:underline text-xs">
                      {item.action}
                    </button>
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
                    title="Delete notification"
                    aria-label="Delete notification"
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
        <div className="col-span-4 space-y-6">
          
          {/* Unread Summary Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm mb-2">Unread Summary</h3>
            
            <div className="space-y-2 text-xs">
              <SummaryRow icon={<FilePlus size={14} className="text-blue-600" />} label="New Requests" count={countByType('new_request')} color="bg-blue-50 text-blue-600" />
              <SummaryRow icon={<CheckCircle2 size={14} className="text-emerald-600" />} label="Department Completed" count={countByType('dept_completed')} color="bg-emerald-50 text-emerald-600" />
              <SummaryRow icon={<Clock size={14} className="text-amber-600" />} label="Pending" count={countByType('pending')} color="bg-amber-50 text-amber-600" />
              <SummaryRow icon={<RotateCcw size={14} className="text-red-500" />} label="Returned" count={countByType('returned')} color="bg-red-50 text-red-600" />
              <SummaryRow icon={<Users size={14} className="text-purple-600" />} label="Ready for Final Review" count={countByType('ready_review')} color="bg-purple-50 text-purple-600" />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Total Unread</span>
              <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md">{unreadNotifications.length}</span>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm mb-2">Quick Actions</h3>
            
            <div className="space-y-1">
              <QuickActionItem to={isEmployeeRoute ? '/employee/my-clearance' : '/hr-office/clearance-requests'}
                icon={<FilePlus size={16} className="text-blue-600" />} 
                title="Clearance Requests" 
                sub="View all clearance requests" 
              />
              <QuickActionItem to={isEmployeeRoute ? '/employee/my-clearance#status' : '/hr-office/clearance-requests?status=In%20Progress'}
                icon={<Clock size={16} className="text-blue-600" />} 
                title="Pending Follow Ups" 
                sub="Follow up pending clearances" 
              />
              <QuickActionItem to={isEmployeeRoute ? '/employee/my-clearance#history' : '/hr-office/reports'}
                icon={<Users size={16} className="text-blue-600" />} 
                title="Reports" 
                sub="View clearance reports" 
              />
              <QuickActionItem to={isEmployeeRoute ? '/employee/my-clearance#request' : '/hr-office/add-clearance'}
                icon={<CheckCircle2 size={16} className="text-blue-600" />} 
                title={isEmployeeRoute ? 'Create Clearance Request' : 'Create Clearance Request'} 
                sub={isEmployeeRoute ? 'Submit your clearance request' : 'Create request for an employee'} 
              />
            </div>
          </div>

        </div>

      </main>
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