import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  CheckSquare,
  DollarSign,
  Bell,
  Clock,
  FileBarChart,
  ShieldCheck,
  KeyRound,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

// =========================================================
// 1. INLINE API SERVICE HANDLERS
// =========================================================
const API_URL = "http://localhost:3000/api/finance/settings";

const defaultSettings = {
  clearanceRules: {
    requireFinancialReview: true,
    requireRemarksOnReturn: true,
    requireRemarksOnReject: true,
    requireReferenceNumber: true,
    allowApprovalWithBalance: false,
  },
  obligationRules: {
    enableChecking: true,
    allowedTypes: {
      employeeAdvance: true,
      staffLoan: true,
      outstandingPayment: true,
      otherLiability: true,
    },
    outstandingBalanceRule: "ALLOW_OFFICER_DECISION",
  },
  notifications: {
    newClearanceRequest: true,
    requestAssigned: true,
    pendingReminder: true,
    obligationFound: true,
    correctionRequired: true,
    returnedToFinance: true,
    systemAnnouncements: true,
    inAppChannel: true,
    emailChannel: false,
  },
  reminders: {
    enableReminder: true,
    remindAfterDays: 3,
    repeatEveryDays: 2,
  },
  reports: {
    defaultDateRange: "THIS_MONTH",
    defaultReportType: "SUMMARY",
    exportFormats: { pdf: true, excel: true },
    includeEmployeeId: true,
    includeDepartment: true,
    includeReferenceNumber: true,
    includeObligationDetails: true,
  },
  security: {
    requireApprovalConfirmation: true,
    requireReturnConfirmation: true,
    enableAuditLogging: true,
    autoLogoutMinutes: 30,
  },
};

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

const apiGetFinanceSettings = async () => {
  const res = await axios.get(`${API_URL}/`, getAuthConfig());
  return res.data;
};

const apiUpdateFinanceSettings = async (settingsData) => {
  const res = await axios.put(`${API_URL}/`, settingsData, getAuthConfig());
  return res.data;
};

const apiChangePassword = async (passwords) => {
  const res = await axios.put(`${API_URL}/change-password`, passwords, getAuthConfig());
  return res.data;
};

// =========================================================
// 2. MAIN SETTINGS COMPONENT
// =========================================================
const FinanceSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("clearance");
  const [message, setMessage] = useState({ type: "", text: "" });

  const [settings, setSettings] = useState(defaultSettings);

  const normalizeSettings = (incoming = {}) => ({
    ...defaultSettings,
    ...incoming,
    clearanceRules: {
      ...defaultSettings.clearanceRules,
      ...(incoming.clearanceRules || {}),
    },
    obligationRules: {
      ...defaultSettings.obligationRules,
      ...(incoming.obligationRules || {}),
      allowedTypes: {
        ...defaultSettings.obligationRules.allowedTypes,
        ...(incoming.obligationRules?.allowedTypes || {}),
      },
    },
    notifications: {
      ...defaultSettings.notifications,
      ...(incoming.notifications || {}),
    },
    reminders: {
      ...defaultSettings.reminders,
      ...(incoming.reminders || {}),
    },
    reports: {
      ...defaultSettings.reports,
      ...(incoming.reports || {}),
      exportFormats: {
        ...defaultSettings.reports.exportFormats,
        ...(incoming.reports?.exportFormats || {}),
      },
    },
    security: {
      ...defaultSettings.security,
      ...(incoming.security || {}),
    },
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await apiGetFinanceSettings();
      const payload = res?.data?.data || res?.data || {};
      setSettings(normalizeSettings(payload));
    } catch (error) {
      console.error("ቅንብሮችን መጫን አልተቻለም:", error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiUpdateFinanceSettings(settings);
      setMessage({ type: "success", text: "የፋይናንስ ቅንብሮች በጥሩ ሁኔታ ተቀምጠዋል!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "ቅንብሮችን ማስቀመጥ አልተቻለም",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "አዲሱ የይለፍ ቃል እና ማረጋገጫው አይመሳሰሉም" });
      return;
    }
    try {
      setSaving(true);
      await apiChangePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setMessage({ type: "success", text: "የይለፍ ቃልዎ በጥሩ ሁኔታ ተቀይሯል!" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "የይለፍ ቃል መቀየር አልተቻለም",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="font-medium text-gray-500">የ Finance Settings እየጫነ ነው...</p>
      </div>
    );
  }

  const tabs = [
    { id: "clearance", label: "Finance Clearance", icon: CheckSquare },
    { id: "obligations", label: "Financial Obligations", icon: DollarSign },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "reminders", label: "Pending Reminders", icon: Clock },
    { id: "reports", label: "Report Preferences", icon: FileBarChart },
    { id: "security", label: "Security & Audit", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Finance Office
              </p>
              <h1 className="text-2xl font-bold text-slate-900">Finance Settings</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage clearance rules, obligations, notifications, reminders, and account security.
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </div>

        {message.text && (
          <div
            className={`mb-6 flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm font-medium ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage({ type: "", text: "" })}
              className="rounded-full p-1 text-current hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            {activeTab === "clearance" && (
              <div className="space-y-5">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-bold text-slate-900">Clearance Review Rules</h2>
                  <p className="mt-1 text-sm text-slate-500">Control how financial approvals and returns are processed.</p>
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    { label: "Require financial review before approval", key: "requireFinancialReview", warning: false },
                    { label: "Require remarks when returning a request", key: "requireRemarksOnReturn", warning: false },
                    { label: "Require remarks when rejecting a request", key: "requireRemarksOnReject", warning: false },
                    { label: "Generate financial reference number automatically", key: "requireReferenceNumber", warning: false },
                    { label: "Allow approval even when outstanding balance exists", key: "allowApprovalWithBalance", warning: true },
                  ].map(({ label, key, warning }) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300"
                    >
                      <span className={warning ? "font-medium text-red-600" : "text-slate-700"}>{label}</span>
                      <input
                        type="checkbox"
                        checked={settings.clearanceRules[key]}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            clearanceRules: {
                              ...settings.clearanceRules,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "obligations" && (
              <div className="space-y-5">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-bold text-slate-900">Financial Obligation Rules</h2>
                  <p className="mt-1 text-sm text-slate-500">Set approved obligation types and how balances affect clearance decisions.</p>
                </div>

                <div className="space-y-4 text-sm">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="font-medium text-slate-700">Enable financial obligation checking system</span>
                    <input
                      type="checkbox"
                      checked={settings.obligationRules.enableChecking}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          obligationRules: {
                            ...settings.obligationRules,
                            enableChecking: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Checked Oblication Types
                    </p>
                    <div className="space-y-2">
                      {[
                        ["employeeAdvance", "Employee Advance"],
                        ["staffLoan", "Staff Loan"],
                        ["outstandingPayment", "Outstanding Payment"],
                        ["otherLiability", "Other Liability"],
                      ].map(([key, label]) => (
                        <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-white p-2.5 shadow-sm">
                          <span className="text-slate-700">{label}</span>
                          <input
                            type="checkbox"
                            checked={settings.obligationRules.allowedTypes[key]}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                obligationRules: {
                                  ...settings.obligationRules,
                                  allowedTypes: {
                                    ...settings.obligationRules.allowedTypes,
                                    [key]: e.target.checked,
                                  },
                                },
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Outstanding Balance Rule
                    </p>
                    <div className="space-y-2">
                      {[
                        { value: "BLOCK_CLEARANCE", label: "Block clearance automatically" },
                        { value: "ALLOW_OFFICER_DECISION", label: "Allow Finance Officer decision (Recommended)" },
                      ].map((option) => (
                        <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white p-2.5 shadow-sm">
                          <input
                            type="radio"
                            name="balanceRule"
                            value={option.value}
                            checked={settings.obligationRules.outstandingBalanceRule === option.value}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                obligationRules: {
                                  ...settings.obligationRules,
                                  outstandingBalanceRule: e.target.value,
                                },
                              })
                            }
                            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-slate-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-5">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-bold text-slate-900">Notification Preferences</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose the alerts finance officers should receive.</p>
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    ["newClearanceRequest", "New Finance Clearance Request"],
                    ["obligationFound", "Financial Obligation Found"],
                    ["inAppChannel", "In-App Notifications (ON)"],
                    ["requestAssigned", "Request Assigned"],
                    ["pendingReminder", "Pending Reminder"],
                    ["returnedToFinance", "Returned to Finance"],
                    ["systemAnnouncements", "System Announcements"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className={key === "inAppChannel" ? "font-semibold text-blue-700" : "text-slate-700"}>{label}</span>
                      <input
                        type="checkbox"
                        checked={settings.notifications[key]}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "reminders" && (
              <div className="space-y-5">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-bold text-slate-900">Pending Request Reminders</h2>
                  <p className="mt-1 text-sm text-slate-500">Automate reminder timing for unresolved finance requests.</p>
                </div>

                <div className="space-y-4 text-sm">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="font-medium text-slate-700">Enable automatic reminders for pending requests</span>
                    <input
                      type="checkbox"
                      checked={settings.reminders.enableReminder}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          reminders: {
                            ...settings.reminders,
                            enableReminder: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        First Reminder After (Days)
                      </label>
                      <input
                        type="number"
                        value={settings.reminders.remindAfterDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            reminders: {
                              ...settings.reminders,
                              remindAfterDays: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-700 outline-none ring-0 focus:border-blue-500"
                      />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Repeat Reminder Every (Days)
                      </label>
                      <input
                        type="number"
                        value={settings.reminders.repeatEveryDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            reminders: {
                              ...settings.reminders,
                              repeatEveryDays: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-700 outline-none ring-0 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-5">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-bold text-slate-900">Report Defaults</h2>
                  <p className="mt-1 text-sm text-slate-500">Set default report behavior for finance review and exports.</p>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Default Date Range
                    </label>
                    <select
                      value={settings.reports.defaultDateRange}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          reports: { ...settings.reports, defaultDateRange: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value="THIS_MONTH">This Month</option>
                      <option value="THIS_QUARTER">This Quarter</option>
                      <option value="THIS_YEAR">This Year</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Export Includes</p>
                    <div className="space-y-2">
                      {[
                        ["includeReferenceNumber", "Finance Reference Number"],
                        ["includeEmployeeId", "Employee ID"],
                        ["includeDepartment", "Department"],
                        ["includeObligationDetails", "Obligation Details"],
                      ].map(([key, label]) => (
                        <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-white p-2.5 shadow-sm">
                          <span className="text-slate-700">{label}</span>
                          <input
                            type="checkbox"
                            checked={settings.reports[key]}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                reports: {
                                  ...settings.reports,
                                  [key]: e.target.checked,
                                },
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-5">
                <div className="border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-bold text-slate-900">Security & Audit</h2>
                  <p className="mt-1 text-sm text-slate-500">Control approval verification and system audit behavior.</p>
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    ["requireApprovalConfirmation", "Require confirmation prompt before approving clearance"],
                    ["requireReturnConfirmation", "Require return confirmation when sending a request back"],
                    ["enableAuditLogging", "Enable detailed audit logging for decision actions"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-slate-700">{label}</span>
                      <input
                        type="checkbox"
                        checked={settings.security[key]}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            security: {
                              ...settings.security,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Auto Logout Minutes
                    </label>
                    <input
                      type="number"
                      value={settings.security.autoLogoutMinutes}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            autoLogoutMinutes: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
};

export default FinanceSettingsPage;