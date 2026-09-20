import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  History,
  Info,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { fetchClearances } from '../../until/MyclearanceHelper';
import EmployeeNavbar from './employeenavbar';
import EmployeeSidebar from './employeesidbar';

const fallbackSteps = ['Department Head', 'Finance Office', 'Property / Asset Office', 'ICT Office', 'Library Office', 'Final HR Clearance'];

const toneStyles = {
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-500',
  green: 'bg-emerald-50 text-emerald-500',
  red: 'bg-red-50 text-red-500',
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const formatRelativeTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffMin = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hours ago`;
  const diffDays = Math.round(diffHr / 24);
  return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
};

const normalizeOfficeStatus = (status) => {
  const value = String(status || '').trim();
  if (!value) return 'Pending';
  const lowered = value.toLowerCase();
  if (['completed', 'approved', 'cleared', 'done'].includes(lowered)) return 'Completed';
  if (['returned', 'rejected', 'return'].includes(lowered)) return 'Returned';
  if (['in progress', 'under review', 'review'].includes(lowered)) return 'In Progress';
  return 'Pending';
};

const officeStatusFromClearance = (clearance, office, workflow) => {
  const officeName = String(office || '').toLowerCase();
  const statusField = officeName.includes('department')
    ? clearance.departmentStatus
    : officeName.includes('finance')
      ? clearance.financeStatus
      : officeName.includes('property')
        ? clearance.propertyStatus
        : officeName.includes('ict')
          ? clearance.ictStatus || clearance.ictClearance?.status
          : officeName.includes('library')
            ? clearance.libraryStatus
            : null;
  const workflowStep = workflow.find((step) => String(step.office || step.name || '').toLowerCase().includes(officeName));
  return {
    office: workflowStep?.office || office,
    status: normalizeOfficeStatus(statusField || workflowStep?.status),
    date: workflowStep?.updatedAt || workflowStep?.date || workflowStep?.completedAt || '',
    remark: workflowStep?.comment || workflowStep?.remarks || workflowStep?.returnReason || '',
  };
};

const Panel = ({ title, action, children }) => (
  <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <h2 className="text-[11px] font-bold text-slate-800">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const statusBadge = {
  Completed: 'bg-emerald-50 text-emerald-700',
  'In Progress': 'bg-amber-50 text-amber-700',
  Returned: 'bg-red-50 text-red-700',
  Pending: 'bg-slate-100 text-slate-600',
};

export default function EmployeeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/clearance\/?$/, '').replace(/\/api\/?$/, '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const employeeName = user?.name || user?.fullName || 'Abebe';
  const employeeId = user?.employeeId || user?.employee?.employeeId || '';
  const avatar = user?.profileImage || user?.photo || user?.avatar;
  const department = user?.department?.name || user?.department || 'Not provided';
  const campus = user?.campus || 'Main Campus';
  const college = user?.college || user?.institute || 'Not provided';
  const position = user?.position || user?.jobTitle || 'Not provided';

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const clearances = await fetchClearances();
        const sorted = [...clearances].sort((a, b) => new Date(b.createdAt || b.requestDate || 0) - new Date(a.createdAt || a.requestDate || 0));

        const token = localStorage.getItem('token');
        const response = await axios.get(`${apiBaseUrl}/api/notifications/my`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        });

        const payload = Array.isArray(response.data)
          ? response.data
          : response.data?.notifications || response.data?.data || [];

        if (mounted) {
          setRequests(sorted);
          setNotifications(payload.filter((item) => !item.recipientId || String(item.recipientId) === String(user?._id || user?.id || '')));
        }
      } catch (err) {
        if (mounted) setError('Unable to load your employee summary.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (authLoading) return undefined;

    if (user) {
      loadData();
    } else {
      setLoading(false);
    }

    return () => { mounted = false; };
  }, [authLoading, user?._id, user?.id]);

  const currentRequest = requests[0] || null;

  const officeStatusEntries = useMemo(() => {
    if (!currentRequest) return fallbackSteps.map((office) => ({ office, status: 'Pending', date: '' }));

    const workflow = [
      ...(Array.isArray(currentRequest.workflow) ? currentRequest.workflow : []),
      ...(Array.isArray(currentRequest.departmentClearances) ? currentRequest.departmentClearances : []),
    ];
    return fallbackSteps.map((office) => officeStatusFromClearance(currentRequest, office, workflow));
  }, [currentRequest]);

  const totalOffices = officeStatusEntries.length || 6;
  const progressCount = officeStatusEntries.filter((office) => office.status !== 'Pending').length;
  const progressPercent = totalOffices ? Math.round((progressCount / totalOffices) * 100) : 0;

  const activeRequestStatus = currentRequest?.status || 'Pending';
  const returnedOffice = officeStatusEntries.find((office) => office.status === 'Returned');
  const returnReason = currentRequest?.returnReason || currentRequest?.libraryReturnReason || currentRequest?.remarks || returnedOffice?.remark || 'Please resolve the issue and resubmit your request.';

  const summaryCards = [
    { label: 'My Requests', value: requests.length, note: 'Total Requests', icon: FileText, tone: 'blue' },
    { label: 'In Progress', value: requests.filter((request) => ['In Progress', 'Pending', 'Under Review'].includes(request.status || 'Pending')).length, note: 'Clearance Active', icon: Clock3, tone: 'amber' },
    { label: 'Returned', value: requests.filter((request) => ['Returned', 'Rejected'].includes(request.status)).length + (returnedOffice ? 1 : 0), note: 'Needs Attention', icon: XCircle, tone: 'red' },
    { label: 'Certificates', value: notifications.filter((notification) => /certificate|issued/i.test(notification.title || '') || ['CERTIFICATE_ISSUED', 'certificate_available', 'final_completed'].includes(notification.type)).length || (currentRequest?.status === 'Completed' ? 1 : 0), note: currentRequest?.status === 'Completed' ? 'Completed' : 'Issued', icon: ShieldCheck, tone: 'green' },
  ];

  const recentRequests = requests.slice(0, 2).map((request) => ({
    requestId: request.requestId || '-',
    type: request.clearanceType || request.reason || 'N/A',
    status: request.status || 'Pending',
    date: request.requestDate || request.createdAt || '',
  }));

  const certificateNotification = notifications.find((notification) => {
    const title = String(notification.title || '');
    const type = String(notification.type || '');
    return /certificate|issued/i.test(title) || ['CERTIFICATE_ISSUED', 'certificate_available', 'final_completed'].includes(type);
  });

  const latestCertificate = certificateNotification ? {
    number: certificateNotification.message?.match(/Certificate No[:\s]+([^\n.]+)/i)?.[1] || 'BDU/CLR/2026/000125',
    title: certificateNotification.title || 'Employee Clearance Certificate',
    issuedAt: certificateNotification.createdAt || new Date().toISOString(),
  } : null;

  const recentNotifications = notifications.slice(0, 4).map((item) => ({
    title: item.title || 'Clearance Update',
    time: formatRelativeTime(item.createdAt),
    type: item.type || 'new_request',
  }));

  const hasActiveRequest = Boolean(currentRequest && ['Pending', 'In Progress', 'Returned', 'Rejected'].includes(currentRequest.status || 'Pending'));

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-slate-700">
      <div className="hidden lg:block"><EmployeeSidebar /></div>
      {menuOpen && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} />
          <div className="relative z-50 lg:hidden"><EmployeeSidebar onNavigate={() => setMenuOpen(false)} /></div>
        </>
      )}
      <EmployeeNavbar onMenuClick={() => setMenuOpen(true)} />

      <main className="mx-auto max-w-[1440px] space-y-5 p-4 lg:ml-72 lg:p-6">
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[10px] text-red-600">{error}</p>}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">Welcome back, {employeeName}! 👋</h1>
          <p className="mt-1 text-[11px] text-slate-500">Here is an overview of your clearance status.</p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, note, icon: Icon, tone }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${toneStyles[tone]}`}>
                <Icon size={18} />
              </div>
              <p className="text-[11px] font-semibold text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
              <p className="text-[10px] text-slate-400">{note}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Panel title="Current Clearance Request" action={<Link to="/employee/my-clearance" className="flex items-center gap-1 text-[10px] font-semibold text-blue-600">View Clearance Details <ChevronRight size={12} /></Link>}>
            {loading ? (
              <div className="p-5 text-center text-[10px] text-slate-400">Loading current clearance...</div>
            ) : currentRequest ? (
              <div className="space-y-4 p-5">
                <div className="grid gap-2 text-[10px] sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-slate-400">Request No:</span>
                    <p className="mt-1 font-bold text-slate-800">{currentRequest.requestId || '-'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-slate-400">Type:</span>
                    <p className="mt-1 font-bold text-slate-800">{currentRequest.clearanceType || currentRequest.reason || 'Resignation'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-slate-400">Request Date:</span>
                    <p className="mt-1 font-bold text-slate-800">{formatDate(currentRequest.requestDate || currentRequest.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] text-slate-500">Overall Status:</span>
                  <span className={`rounded px-2.5 py-1 text-[10px] font-bold ${statusBadge[activeRequestStatus] || statusBadge.Pending}`}>
                    {activeRequestStatus.toUpperCase()}
                  </span>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Progress:</span>
                    <span>{progressCount} / {totalOffices} Offices</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] font-semibold text-slate-600">{progressPercent}%</p>
                </div>

                <div className="space-y-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Office Status</div>
                  <div className="space-y-2">
                    {officeStatusEntries.map((office) => (
                      <div key={`${office.office}-${office.status}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white p-2.5 text-[10px]">
                        <div className="flex items-center gap-2 truncate">
                          <span className="min-w-[70px] font-semibold text-slate-700">{office.office}</span>
                        </div>
                        <span className={`rounded px-2 py-1 font-bold ${statusBadge[office.status] || statusBadge.Pending}`}>
                          {office.status === 'Completed' ? 'Approved' : office.status === 'Returned' ? 'Returned' : office.status === 'In Progress' ? 'In Progress' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 text-center text-[10px] text-slate-400">No active clearance request found.</div>
            )}
          </Panel>

          {currentRequest && returnedOffice && ['Returned', 'Rejected'].includes(String(currentRequest.status || '')) && (
            <Panel title="Action Required" action={<Link to="/employee/my-clearance" className="text-[10px] font-semibold text-blue-600">View Details</Link>}>
              <div className="space-y-4 p-5">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle size={16} />
                  <span className="text-[11px] font-bold">Your clearance request has been returned by {returnedOffice.office}.</span>
                </div>

                <div className="rounded-lg bg-red-50 p-3 text-[10px] text-red-700">
                  <p className="font-semibold">Reason:</p>
                  <p className="mt-1">{returnReason}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to="/employee/my-clearance" className="rounded-md bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white">View Details</Link>
                  <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700">
                    Resubmit Request
                  </button>
                </div>
              </div>
            </Panel>
          )}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Panel title="Recent Requests" action={<Link to="/employee/my-clearance" className="text-[10px] font-semibold text-blue-600">View All Requests</Link>}>
            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="pb-2 pr-4 font-semibold">Request No</th>
                    <th className="pb-2 pr-4 font-semibold">Type</th>
                    <th className="pb-2 pr-4 font-semibold">Status</th>
                    <th className="pb-2 pr-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.length ? recentRequests.map((request) => (
                    <tr key={request.requestId} className="border-b border-slate-50 last:border-b-0">
                      <td className="py-3 pr-4 font-semibold text-slate-800">{request.requestId}</td>
                      <td className="py-3 pr-4 text-slate-600">{request.type}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded px-2 py-1 font-bold ${statusBadge[request.status] || statusBadge.Pending}`}>
                          {String(request.status).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Link to="/employee/my-clearance" className="font-semibold text-blue-600">View</Link>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">No recent requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="My Certificates" action={latestCertificate ? <Link to="/employee/documents" className="text-[10px] font-semibold text-blue-600">View</Link> : null}>
            {latestCertificate ? (
              <div className="space-y-4 p-5">
                <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <div className="rounded-full bg-emerald-600 p-2 text-white">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-emerald-700">Employee Clearance Certificate</p>
                    <p className="mt-2 text-[10px] text-slate-600">Certificate No:</p>
                    <p className="font-mono text-[10px] font-semibold text-slate-800">{latestCertificate.number}</p>
                  </div>
                </div>

                <div className="space-y-2 text-[10px] text-slate-600">
                  <div className="flex items-center justify-between"><span>Status:</span><span className="font-bold text-emerald-600">✅ ISSUED</span></div>
                  <div className="flex items-center justify-between"><span>Issue Date:</span><span className="font-semibold text-slate-800">{formatDate(latestCertificate.issuedAt)}</span></div>
                </div>

                <div className="flex gap-2">
                  <Link to="/employee/documents" className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-center text-[10px] font-semibold text-white">👁 View</Link>
                  <button type="button" className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700">⬇ Download</button>
                </div>
              </div>
            ) : (
              <div className="p-5 text-center text-[10px] text-slate-500">
                <p className="font-semibold text-slate-700">No certificate issued yet.</p>
                <p className="mt-1">Your certificate will appear here once it is issued.</p>
              </div>
            )}
          </Panel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Panel title="Recent Notifications" action={<Link to="/employee/notifications" className="text-[10px] font-semibold text-blue-600">View All Notifications</Link>}>
            <div className="space-y-3 p-4">
              {recentNotifications.length ? recentNotifications.map((item, idx) => (
                <div key={`${item.title}-${idx}`} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${item.type.includes('certificate') || item.type.includes('CERTIFICATE') ? 'bg-emerald-100 text-emerald-600' : item.type.includes('returned') || item.type.includes('RETURN') ? 'bg-red-100 text-red-600' : item.type.includes('completed') || item.type.includes('COMPLETED') ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                    {item.type.includes('certificate') || item.type.includes('CERTIFICATE') ? <ShieldCheck size={14} /> : item.type.includes('returned') || item.type.includes('RETURN') ? <RefreshCw size={14} /> : item.type.includes('completed') || item.type.includes('COMPLETED') ? <CheckCircle2 size={14} /> : <Bell size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800">{item.title}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{item.time}</p>
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center text-[10px] text-slate-400">No recent notifications.</div>
              )}
            </div>
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid grid-cols-2 gap-3 p-4">
              <button
                type="button"
                disabled={hasActiveRequest}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center text-[10px] ${hasActiveRequest ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : 'border-blue-200 bg-blue-50 text-blue-700'}`}
              >
                <Plus size={18} />
                <span className="font-semibold">New Clearance Request</span>
              </button>

              <Link to="/employee/my-clearance" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center text-[10px] text-emerald-700">
                <FolderOpen size={18} />
                <span className="font-semibold">My Clearance Requests</span>
              </Link>

              <Link to="/employee/documents" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3 text-center text-[10px] text-purple-700">
                <ShieldCheck size={18} />
                <span className="font-semibold">My Certificates</span>
              </Link>

              <Link to="/employee/profile" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-[10px] text-slate-700">
                <UserRound size={18} />
                <span className="font-semibold">My Profile</span>
              </Link>
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}
