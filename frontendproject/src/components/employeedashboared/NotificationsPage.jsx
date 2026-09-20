import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Send, CheckCircle2, Users, Clock, ShieldAlert,
  Award, FileCheck, Download, MailCheck,
  ChevronLeft, ChevronRight, ChevronDown, Trash2
} from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
  .replace(/\/api\/clearance\/?$/, '')
  .replace(/\/api\/?$/, '');

const iconMap = {
  submit: { icon: Send, color: 'text-blue-500', bg: 'bg-blue-50' },
  check: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  users: { icon: Users, color: 'text-amber-500', bg: 'bg-amber-50' },
  clock: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  shield: { icon: ShieldAlert, color: 'text-purple-500', bg: 'bg-purple-50' },
  award: { icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  completed: { icon: FileCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  download: { icon: Download, color: 'text-blue-500', bg: 'bg-blue-50' }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  const authConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications/my`, authConfig());
      setNotifications(res.data.notifications || res.data.data || res.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to load notifications.');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/api/notifications/mark-all-read`, {}, authConfig());
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkSingleRead = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/notifications/${id}`, {}, authConfig());
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      setError('Unable to delete notification: notification id is missing.');
      return;
    }
    try {
      setError('');
      await axios.delete(`${API_BASE_URL}/api/notifications/${id}`, authConfig());
      setNotifications((prev) => prev.filter((item) => (item._id || item.id) !== id));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to delete notification.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 font-sans text-xs">
      <div className="max-w-6xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-500 text-[11px] mt-0.5">
              All important updates about your clearance process
            </p>
          </div>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center space-x-1.5 border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-3 py-1.5 rounded-md transition-colors text-[11px]"
          >
            <MailCheck size={14} />
            <span>Mark all as read</span>
          </button>
        </div>
        {error && <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-[11px] font-medium text-red-700">{error}</div>}

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4">Notification</th>
                <th className="py-3 px-4">Related To</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notifications.map((item, idx) => {
                const config = iconMap[item.type] || iconMap.check;
                const IconComponent = config.icon;
                const formattedDate = new Date(item.createdAt).toLocaleDateString('en-GB');
                const formattedTime = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr key={item._id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg shrink-0 ${config.bg} ${config.color}`}>
                          <IconComponent size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                          <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                            {item.message || item.description || 'Notification received.'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-600 text-[11px] whitespace-nowrap">
                      {item.relatedRequestId || item.clearanceRequestId || item.relatedTo || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] whitespace-nowrap">
                      <div className="font-medium text-slate-700">{formattedDate}</div>
                      <div className="text-slate-400 text-[10px]">{formattedTime}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleMarkSingleRead(item._id)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                          !item.isRead
                            ? 'bg-blue-100/70 text-blue-700 hover:bg-blue-200'
                            : 'bg-emerald-100/70 text-emerald-700 cursor-default'
                        }`}
                      >
                        {item.isRead ? 'Read' : 'Unread'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => handleDelete(item._id || item.id)} title="Delete notification" className="text-slate-400 hover:text-red-600 p-1 rounded-full">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center p-4 border-t border-slate-100 text-[11px] text-slate-500">
          <div>Showing 1 to {notifications.length} of {notifications.length} notifications</div>
          <div className="flex items-center space-x-2">
            <button className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-400">
              <ChevronLeft size={14} />
            </button>
            <button className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded">1</button>
            <button className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-400">
              <ChevronRight size={14} />
            </button>
            <div className="relative ml-2">
              <select className="appearance-none border border-slate-200 rounded px-2.5 py-1 pr-6 bg-white text-slate-700 outline-none">
                <option>10 / page</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}