import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FileText,
  Filter,
  Printer,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Clock,
  History,
  DollarSign,
  RefreshCw,
} from "lucide-react";

// =========================================================
// 1. INLINE API SERVICE HANDLERS (በተመሳሳይ ፋይል ውስጥ የተካተቱ)
// =========================================================
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000")
  .replace(/\/api\/clearance\/?$/, "")
  .replace(/\/api\/?$/, "");
const API_URL = `${API_BASE_URL}/api/finance/reports`;

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

const apiGetObligationsReport = async (filters) => {
  const res = await axios.get(`${API_URL}/obligations`, { ...getAuthConfig(), params: filters });
  return res.data;
};

const apiGetPendingReport = async (filters) => {
  const res = await axios.get(`${API_URL}/pending`, { ...getAuthConfig(), params: filters });
  return res.data;
};

const apiGetHistoryReport = async (filters) => {
  const res = await axios.get(`${API_URL}/history`, { ...getAuthConfig(), params: filters });
  return res.data;
};

const getDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPeriodRange = (period) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (period === "weekly") {
    const daysFromMonday = (today.getDay() + 6) % 7;
    start.setDate(today.getDate() - daysFromMonday);
    end.setDate(start.getDate() + 6);
  } else if (period === "monthly") {
    start.setDate(1);
    end.setMonth(today.getMonth() + 1, 0);
  } else if (period === "yearly") {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }

  return { startDate: getDateInputValue(start), endDate: getDateInputValue(end) };
};

const defaultPeriodRange = getPeriodRange("monthly");

// =========================================================
// 2. MAIN COMPONENT
// =========================================================
const FinanceReportsPage = () => {
  const [filters, setFilters] = useState({
    period: "monthly",
    ...defaultPeriodRange,
    campus: "",
    department: "",
    clearanceReason: "",
    status: "",
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [obligationsData, setObligationsData] = useState([]);
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [obligationsRes, pendingRes, historyRes] = await Promise.all([
        apiGetObligationsReport(filters),
        apiGetPendingReport(filters),
        apiGetHistoryReport(filters),
      ]);

      setObligationsData(obligationsRes?.data?.data || obligationsRes?.data || []);
      setPendingData(pendingRes?.data?.data || pendingRes?.data || []);
      setHistoryData(historyRes?.data?.data || historyRes?.data || []);
    } catch (error) {
      console.error("ሪፖርቶችን መጫን አልተቻለም:", error);
      setObligationsData([]);
      setPendingData([]);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((current) => {
      if (name === "period" && value !== "custom") {
        return { ...current, period: value, ...getPeriodRange(value) };
      }
      if (name === "period") return { ...current, period: value, startDate: "", endDate: "" };
      return { ...current, [name]: value };
    });
  };

  const handleGenerateReport = (e) => {
    e.preventDefault();
    fetchAllReports();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 print:p-0 print:bg-white">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
            <DollarSign size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance Clearance Reports</h1>
            <p className="text-sm text-gray-500">የፋይናንስ ክሊራንስ ዋና ሪፖርቶች መከታተያ</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={() => alert("የExcel ኤክስፖርት ዝግጅት ላይ ነው")}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition shadow-sm"
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filter Form */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm print:hidden">
        <div className="mb-4 flex items-center gap-2 font-semibold text-gray-700">
          <Filter size={18} />
          <span>Report Filters</span>
        </div>
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-800">Report Period</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly'], ['custom', 'Custom Date Range']].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="period" value={value} checked={filters.period === value} onChange={handleFilterChange} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <form onSubmit={handleGenerateReport} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              disabled={filters.period !== "custom"}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              disabled={filters.period !== "custom"}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              <option value="ICT">ICT</option>
              <option value="Library">Library</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Clearance Reason</label>
            <select
              name="clearanceReason"
              value={filters.clearanceReason}
              onChange={handleFilterChange}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Reasons</option>
              <option value="Resignation">Resignation</option>
              <option value="Retirement">Retirement</option>
              <option value="Contract End">Contract End</option>
              <option value="Termination">Termination</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="In Progress">In Progress</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Filter size={16} />}
              Generate Report
            </button>
          </div>
        </form>
      </div>

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-xl font-bold">University Employee Clearance Management System</h1>
        <h2 className="text-lg font-semibold text-gray-700">Finance Clearance Official Report</h2>
        <p className="text-xs text-gray-500">Generated Date: {new Date().toLocaleDateString()}</p>
        <hr className="my-3" />
      </div>

      {/* REPORT 2: Outstanding Financial Obligations */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-800 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          2. Outstanding Financial Obligations Report
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-y border-gray-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Obligation Type</th>
                <th className="py-3 px-4">Amount Due</th>
                <th className="py-3 px-4">Balance Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {obligationsData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-400">
                    ምንም ያልተከፈለ እዳ ያለበት ሰራተኛ አልተገኘም።
                  </td>
                </tr>
              ) : (
                obligationsData.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{item.employeeName}</td>
                    <td className="py-3 px-4">{item.employeeId}</td>
                    <td className="py-3 px-4">{item.department}</td>
                    <td className="py-3 px-4">{item.financialObligation?.type || "N/A"}</td>
                    <td className="py-3 px-4 font-semibold text-gray-700">
                      {item.financialObligation?.amountDue?.toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-4 font-bold text-red-600">
                      {item.financialObligation?.balance?.toLocaleString()} ETB
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPORT 3: Pending Finance Clearance */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-800 flex items-center gap-2">
          <Clock className="text-orange-500" size={20} />
          3. Pending Finance Clearance Report
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-y border-gray-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Request Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Days Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-400">
                    ምንም የሚጠበቅ (Pending) የክሊራንስ ጥያቄ የለም።
                  </td>
                </tr>
              ) : (
                pendingData.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{item.employeeName}</td>
                    <td className="py-3 px-4">{item.department}</td>
                    <td className="py-3 px-4">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.financeStatus === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {item.financeStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-orange-600">{item.daysPending} days</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPORT 4: Finance Clearance History */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-800 flex items-center gap-2">
          <History className="text-purple-600" size={20} />
          4. Finance Clearance History Report
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 uppercase text-gray-700 border-y border-gray-200">
              <tr>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Decision</th>
                <th className="py-3 px-3">Reviewed By</th>
                <th className="py-3 px-3">Review Date</th>
                <th className="py-3 px-3">Ref No.</th>
                <th className="py-3 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historyData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-400">
                    ምንም የተቀመጠ የታሪክ ሪፖርት አልተገኘም።
                  </td>
                </tr>
              ) : (
                historyData.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-900">
                      {item.employeeName} ({item.employeeId})
                    </td>
                    <td className="py-3 px-3">{item.department}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                          item.financeStatus === "Approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.financeStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">{item.financeReviewedByName || "N/A"}</td>
                    <td className="py-3 px-3">
                      {item.financeReviewedAt
                        ? new Date(item.financeReviewedAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="py-3 px-3 font-mono">{item.financeReferenceNumber || "-"}</td>
                    <td className="py-3 px-3 truncate max-w-xs">{item.financeRemarks || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceReportsPage;