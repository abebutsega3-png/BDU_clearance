import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchUnreadNotificationCount } from '../../until/NotificationHelper';
import { useAdminLanguage } from './AdminLanguage';
import { subscribeToNotifications } from '../../until/notificationSocket';
import { useAuth } from '../../context/authContext';

export default function AdminNotificationBell() {
  const navigate = useNavigate();
  const { t } = useAdminLanguage();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetchUnreadNotificationCount()
      .then((count) => {
        if (active) setUnreadCount(count);
      })
      .catch((error) => {
        console.error('Failed to load System Admin notification count:', error);
      });

    const refreshCount = () => {
      fetchUnreadNotificationCount()
        .then((count) => {
          if (active) setUnreadCount(count);
        })
        .catch((error) => console.error('Failed to refresh System Admin notification count:', error));
    };
    window.addEventListener('notifications-updated', refreshCount);
    const unsubscribe = subscribeToNotifications((notification) => {
      if (String(notification.recipientId || '') === String(user?._id || user?.id || '')) {
        window.dispatchEvent(new Event('notifications-updated'));
      }
    });

    return () => {
      active = false;
      window.removeEventListener('notifications-updated', refreshCount);
      unsubscribe();
    };
  }, [user?._id, user?.id]);

  return (
    <button
      type="button"
      onClick={() => navigate('/admin/notifications')}
      className="relative rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      aria-label={`${t('Notifications')}${unreadCount ? `, ${unreadCount} ${t('unread')}` : ''}`}
      title={t('Open notifications')}
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
