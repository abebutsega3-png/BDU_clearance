import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Bell,
  CheckCheck,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";

// =========================================================
// 1. INLINE API SERVICE HANDLERS (በተመሳሳይ ፋይል ውስጥ የተካተቱ)
// =========================================================
const API_URL = "http://localhost:3000/api";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

const apiGetMyNotifications = async () => {
  const response = await axios.get(`${API_URL}/finance/notifications`, getAuthConfig());
  return response.data;
};

const apiMarkAsRead = async (id) => {
  const response = await axios.patch(
    `${API_URL}/finance/notifications/${id}/read`,
    {},
    getAuthConfig()
  );
  return response.data;
};

const apiMarkAllAsRead = async () => {
  const response = await axios.patch(
    `${API_URL}/finance/notifications/read-all`,
    {},
    getAuthConfig()
  );
  return response.data;
};

const apiDeleteNotification = async (id) => {
  const response = await axios.delete(`${API_URL}/finance/notifications/${id}`, getAuthConfig());
  return response.data;
};

// =========================================================
// 2. MAIN COMPONENT
// =========================================================
const FinanceNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiGetMyNotifications();
      setNotifications(response.data || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error("ማሳወቂያዎችን መጫን አልተቻለም:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await apiMarkAsRead(notification._id);
      }
      if (notification.actionLink) {
        window.location.href = notification.actionLink;
      }
      loadNotifications();
    } catch (error) {
      console.error("ማሳወቂያውን ማዘመን አልተቻለም:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiMarkAllAsRead();
      loadNotifications();
    } catch (error) {
      console.error("ሁሉንም ማሳወቂያዎች ማዘመን አልተቻለም:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiDeleteNotification(id);
      setNotifications((current) => current.filter((notification) => notification._id !== id));
      setUnreadCount((current) => Math.max(0, current - (notifications.find((notification) => notification._id === id)?.isRead ? 0 : 1)));
    } catch (error) {
      console.error("ማሳወቂያውን መሰረዝ አልተቻለም:", error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "NEW_REQUEST":
        return <FileText size={20} />;
      case "REQUEST_ASSIGNED":
        return <Bell size={20} />;
      case "PENDING_REMINDER":
        return <Clock size={20} />;
      case "OBLIGATION_FOUND":
      case "CORRECTION_REQUIRED":
        return <AlertTriangle size={20} />;
      case "FINANCE_APPROVED":
        return <CheckCircle size={20} />;
      case "FINANCE_RETURNED":
        return <RotateCcw size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const getIconStyle = (type) => {
    switch (type) {
      case "FINANCE_APPROVED":
        return "bg-green-100 text-green-600";
      case "FINANCE_RETURNED":
        return "bg-red-100 text-red-600";
      case "OBLIGATION_FOUND":
        return "bg-orange-100 text-orange-600";
      case "PENDING_REMINDER":
        return "bg-yellow-100 text-yellow-600";
      default:
        return "bg-blue-100 text-blue-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Section */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">Recent updates and clearance requests</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <CheckCheck size={17} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Unread Card Indicator */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Unread notifications</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{unreadCount}</p>
          </div>
          <Bell size={28} className="text-blue-600" />
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={40} className="mx-auto mb-3 text-gray-300" />
            <h3 className="font-semibold text-gray-700">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500">There are no new notifications at the moment.</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`cursor-pointer border-b border-gray-100 p-5 transition hover:bg-gray-50 ${
                  !notification.isRead ? "bg-blue-50/50" : "bg-white"
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${getIconStyle(
                      notification.type
                    )}`}
                  >
                    {getIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3
                          className={`text-sm font-semibold ${
                            !notification.isRead ? "text-gray-900" : "text-gray-700"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                        {(notification.targetName || notification.relatedRequestId) && (
                          <p className="mt-1 text-xs font-medium text-blue-600">
                            {notification.targetName || 'Employee'}
                            {notification.relatedRequestId ? ` — ${notification.relatedRequestId}` : ''}
                          </p>
                        )}
                      </div>
                      {!notification.isRead && (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </div>

                    {notification.clearanceRequest && (
                      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                          <div>
                            <span className="text-gray-500">Request number:</span>
                            <p className="font-medium text-gray-800">
                              {notification.clearanceRequest.requestNumber}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Employee:</span>
                            <p className="font-medium text-gray-800">
                              {notification.clearanceRequest.employeeName}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Department:</span>
                            <p className="font-medium text-gray-800">
                              {notification.clearanceRequest.department}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="mt-3 text-xs text-gray-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleNotificationClick(notification);
                      }}
                      className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {notification.actionText || "View Request"}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(notification._id);
                      }}
                      title="Delete notification"
                      aria-label="Delete notification"
                      className="mt-3 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceNotifications;