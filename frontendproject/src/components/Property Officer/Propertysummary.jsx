import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Clock,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  FileText,
  History,
  Activity,
  BarChart2,
  Loader2,
  ListCheck
} from 'lucide-react';

export default function PropertyDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Initial State starting empty (No hardcoded/pre-registered dummy users)
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalRequests: 0,
      pendingRequests: 0,
      underReview: 0,
      approved: 0,
      returned: 0,
      outstandingAssetsCount: 0
    },
    pendingRequests: [],
    outstandingAssets: [],
    recentActivities: []
  });

  // Fetch Live Dashboard Data from API System Database
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await axios.get('http://localhost:3000/api/property/dashboard/dashboard');
        if (res.data) {
          const summary = res.data.summary || {};
          setDashboardData({
            ...res.data,
            summary: {
              totalRequests: summary.totalRequests || 0,
              pendingRequests: summary.pendingRequests ?? summary.pending ?? 0,
              pending: summary.pendingRequests ?? summary.pending ?? 0,
              underReview: summary.underReview || 0,
              approved: summary.approved || 0,
              returned: summary.returned || 0,
              outstandingAssets: summary.outstandingAssets || 0,
              outstandingAssetsCount: summary.outstandingAssetsCount ?? summary.outstandingAssets ?? 0
            }
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard data from server:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 text-xs">
        <Loader2 className="animate-spin mr-2" size={18} />
        <span>የProperty Dashboard መረጃዎችን በማስገባት ላይ...</span>
      </div>
    );
  }

  const { summary, pendingRequests, outstandingAssets, recentActivities } = dashboardData;

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-xs text-slate-700 space-y-6">
      
      {/* Module Title */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Boxes className="text-teal-600" size={18} />
            <span>PROPERTY / ASSET OFFICER DASHBOARD</span>
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Bahir Dar University — Employee Clearance Management System
          </p>
        </div>
      </div>

      {/* 1. 📊 SUMMARY CARDS (Live Dynamic Stats from DB) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold text-[11px]">Total Requests</span>
            <ListCheck size={15} className="text-slate-400" />
          </div>
          <p className="text-xl font-bold text-slate-900">{summary.totalRequests}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm space-y-1 bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700">
            <span className="font-semibold text-[11px]">Pending Requests</span>
            <Clock size={15} />
          </div>
          <p className="text-xl font-bold text-amber-900">{summary.pendingRequests}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-sm space-y-1 bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-700">
            <span className="font-semibold text-[11px]">Under Review</span>
            <Clock size={15} />
          </div>
          <p className="text-xl font-bold text-blue-900">{summary.underReview}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm space-y-1 bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="font-semibold text-[11px]">Approved</span>
            <CheckCircle2 size={15} />
          </div>
          <p className="text-xl font-bold text-emerald-900">{summary.approved}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-sm space-y-1 bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700">
            <span className="font-semibold text-[11px]">Returned</span>
            <RotateCcw size={15} />
          </div>
          <p className="text-xl font-bold text-rose-900">{summary.returned}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-sm space-y-1 bg-purple-50/20">
          <div className="flex items-center justify-between text-purple-700">
            <span className="font-semibold text-[11px]">Outstanding Assets</span>
            <AlertTriangle size={15} />
          </div>
          <p className="text-xl font-bold text-purple-900">{summary.outstandingAssetsCount} Assets</p>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">

          {/* 2. 📋 PENDING CLEARANCE REQUESTS TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center space-x-2">
                <Clock size={15} className="text-amber-600" />
                <span>Pending Clearance Requests</span>
              </h2>
              <button
                onClick={() => navigate('/property/clearance-requests')}
                className="text-teal-700 hover:text-teal-800 font-semibold flex items-center space-x-0.5 text-[11px]"
              >
                <span>View All</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="p-3">Request ID</th>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-4 text-center text-slate-400">
                        በሲስተሙ የተመዘገበ የጸደቀ ወይም የሚጠበቅ የPending Clearance ጥያቄ የለም።
                      </td>
                    </tr>
                  ) : (
                    pendingRequests.map((req) => (
                      <tr key={req._id || req.requestId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-teal-700">{req.requestId}</td>
                        <td className="p-3 font-medium text-slate-800">{req.employeeName}</td>
                        <td className="p-3 text-slate-600">{req.department}</td>
                        <td className="p-3 text-slate-500">{req.date}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => navigate('/property/clearance-requests')}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded flex items-center space-x-1 text-[11px] transition-colors ml-auto"
                          >
                            <FileText size={12} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. ⚠️ OUTSTANDING ASSETS TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-purple-50/50 border-b border-purple-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center space-x-2">
                <AlertTriangle size={15} className="text-purple-600" />
                <span>Outstanding Assets (Unreturned University Property)</span>
              </h2>
              <button
                onClick={() => navigate('/property/asset-records')}
                className="text-purple-700 hover:text-purple-800 font-semibold flex items-center space-x-0.5 text-[11px]"
              >
                <span>View All</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="p-3">Employee</th>
                    <th className="p-3">Asset</th>
                    <th className="p-3">Asset ID</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outstandingAssets.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-slate-400">
                        በሲስተሙ ያልተመለሱ የንብረት ዝርዝሮች አልተገኙም።
                      </td>
                    </tr>
                  ) : (
                    outstandingAssets.map((asset) => (
                      <tr key={asset._id || asset.assetId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-medium text-slate-800">{asset.employeeName}</td>
                        <td className="p-3 font-semibold text-slate-700">{asset.assetName}</td>
                        <td className="p-3 font-mono text-slate-500">{asset.assetId}</td>
                        <td className="p-3 text-right">
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold text-[10px]">
                            {asset.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* 4. 📊 CLEARANCE STATUS OVERVIEW */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <BarChart2 size={16} className="text-teal-700" />
              <h2 className="font-bold text-slate-900">Clearance Status Overview</h2>
            </div>

            <div className="space-y-3 font-medium">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-700 font-semibold">Approved</span>
                  <span className="text-emerald-700 font-bold">{summary.approved}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: summary.totalRequests > 0 ? `${(summary.approved / summary.totalRequests) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-700 font-semibold">Pending</span>
                  <span className="text-amber-700 font-bold">{summary.pendingRequests}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: summary.totalRequests > 0 ? `${(summary.pendingRequests / summary.totalRequests) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-700 font-semibold">Returned</span>
                  <span className="text-rose-700 font-bold">{summary.returned}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-300"
                    style={{ width: summary.totalRequests > 0 ? `${(summary.returned / summary.totalRequests) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-700 font-semibold">Under Review</span>
                  <span className="text-blue-700 font-bold">{summary.underReview}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: summary.totalRequests > 0 ? `${(summary.underReview / summary.totalRequests) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. 🕒 RECENT ACTIVITY FEED */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Activity size={16} className="text-teal-700" />
              <h2 className="font-bold text-slate-900">Recent Activity</h2>
            </div>

            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <p className="text-slate-400 text-[11px] text-center py-2">ምንም ቅርብ ጊዜ የተከናወነ ክንውን የለም።</p>
              ) : (
                recentActivities.map((act) => (
                  <div key={act._id || act.id} className="flex items-start space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="mt-0.5">
                      {act.type === 'Approved' ? (
                        <CheckCircle2 size={15} className="text-emerald-600" />
                      ) : act.type === 'Returned' ? (
                        <RotateCcw size={15} className="text-rose-600" />
                      ) : (
                        <Clock size={15} className="text-blue-600" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800">{act.action}</p>
                      <p className="text-[10px] text-slate-400">{act.timeAgo}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 6. ⚡ QUICK ACTIONS */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/property/clearance-requests')}
                className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold rounded-lg border border-amber-200 text-center transition-colors flex flex-col items-center justify-center space-y-1"
              >
                <Clock size={14} className="text-amber-700" />
                <span>Pending Requests</span>
              </button>

              <button
                onClick={() => navigate('/property/asset-records')}
                className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 font-semibold rounded-lg border border-purple-200 text-center transition-colors flex flex-col items-center justify-center space-y-1"
              >
                <AlertTriangle size={14} className="text-purple-700" />
                <span>Outstanding Assets</span>
              </button>

              <button
                onClick={() => navigate('/property/clearance-history')}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg border border-slate-200 text-center transition-colors flex flex-col items-center justify-center space-y-1"
              >
                <History size={14} className="text-slate-700" />
                <span>Clearance History</span>
              </button>

              <button
                onClick={() => navigate('/property/reports')}
                className="p-2.5 bg-teal-50 hover:bg-teal-100 text-teal-900 font-semibold rounded-lg border border-teal-200 text-center transition-colors flex flex-col items-center justify-center space-y-1"
              >
                <FileText size={14} className="text-teal-700" />
                <span>Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}