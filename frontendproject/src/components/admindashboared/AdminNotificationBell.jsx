import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications } from '../../until/NotificationHelper';

export default function AdminNotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetchNotifications()
      .then((items) => {
        if (!active) return;
        setUnreadCount(items.filter((item) => item.isRead === false || (item.isRead === undefined && item.status !== 'Read')).length);
      })
      .catch(() => {
        if (active) setUnreadCount(0);
      });

    return () => { active = false; };
  }, []);

  return (
    <button
      type="button"
      onClick={() => navigate('/admin/notifications')}
      className="relative rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      title="Open notifications"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
