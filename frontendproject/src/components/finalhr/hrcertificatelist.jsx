import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import universityLogo from '../../assets/image.png';

const baseCertificateRows = [
  {
    certificateNo: 'BDU/CLR/2024/000125',
    employee: 'Abebe Kebede',
    employeeId: 'EMP-00125',
    department: 'Information Technology',
    generatedDate: '2024-05-18',
    generatedBy: 'HR Officer',
    status: 'Generated',
    clearanceSummary: [
      { name: 'HR Office', status: 'Approved' },
      { name: 'Library', status: 'Cleared' },
      { name: 'Finance', status: 'Cleared' },
      { name: 'Property Management', status: 'Cleared' },
      { name: 'ICT Center', status: 'Cleared' },
      { name: 'Department', status: 'Cleared' },
    ],
  },
  {
    certificateNo: 'BDU/CLR/2024/000124',
    employee: 'Almaz Tadesse',
    employeeId: 'EMP-00126',
    department: 'Finance',
    generatedDate: '2024-05-17',
    generatedBy: 'HR Officer',
    status: 'Issued',
    clearanceSummary: [
      { name: 'HR Office', status: 'Approved' },
      { name: 'Library', status: 'Cleared' },
      { name: 'Finance', status: 'Cleared' },
      { name: 'Property Management', status: 'Cleared' },
      { name: 'ICT Center', status: 'Cleared' },
      { name: 'Department', status: 'Cleared' },
    ],
  },
  {
    certificateNo: 'BDU/CLR/2024/000123',
    employee: 'Selamawit Biru',
    employeeId: 'EMP-00130',
    department: 'HR',
    generatedDate: '2024-05-16',
    generatedBy: 'HR Officer',
    status: 'Issued',
    clearanceSummary: [
      { name: 'HR Office', status: 'Approved' },
      { name: 'Library', status: 'Cleared' },
      { name: 'Finance', status: 'Cleared' },
      { name: 'Property Management', status: 'Cleared' },
      { name: 'ICT Center', status: 'Cleared' },
      { name: 'Department', status: 'Cleared' },
    ],
  },
  {
    certificateNo: 'BDU/CLR/2024/000122',
    employee: 'Yonas Getachew',
    employeeId: 'EMP-00131',
    department: 'Administration',
    generatedDate: '2024-05-15',
    generatedBy: 'HR Officer',
    status: 'Issued',
    clearanceSummary: [
      { name: 'HR Office', status: 'Approved' },
      { name: 'Library', status: 'Cleared' },
      { name: 'Finance', status: 'Cleared' },
      { name: 'Property Management', status: 'Cleared' },
      { name: 'ICT Center', status: 'Cleared' },
      { name: 'Department', status: 'Cleared' },
    ],
  },
  {
    certificateNo: 'BDU/CLR/2024/000121',
    employee: 'Dawit Alemu',
    employeeId: 'EMP-00127',
    department: 'Library',
    generatedDate: '2024-05-15',
    generatedBy: 'HR Officer',
    status: 'Generated',
    clearanceSummary: [
      { name: 'HR Office', status: 'Approved' },
      { name: 'Library', status: 'Cleared' },
      { name: 'Finance', status: 'Cleared' },
      { name: 'Property Management', status: 'Cleared' },
      { name: 'ICT Center', status: 'Cleared' },
      { name: 'Department', status: 'Cleared' },
    ],
  },
];

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function HRCertificateList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const { data } = await axios.get('http://localhost:3000/api/hr-final-clearance/certificates');
        setRows(data?.data || []);
      } catch (error) {
        console.error('Failed to load HR certificates:', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  const departments = useMemo(() => ['All Departments', ...new Set(rows.map((row) => row.department))], [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !search ||
        row.employee.toLowerCase().includes(search) ||
        row.employeeId.toLowerCase().includes(search) ||
        row.certificateNo.toLowerCase().includes(search);
      const matchesDepartment = selectedDepartment === 'All Departments' || row.department === selectedDepartment;
      const matchesStatus = selectedStatus === 'All Status' || row.status === selectedStatus;
      const rowDate = new Date(row.generatedDate);
      const matchesFrom = !fromDate || rowDate >= new Date(fromDate);
      const matchesTo = !toDate || rowDate <= new Date(toDate);

      return matchesSearch && matchesDepartment && matchesStatus && matchesFrom && matchesTo;
    });
  }, [rows, searchTerm, selectedDepartment, selectedStatus, fromDate, toDate]);

  const totalCertificates = rows.length;
  const generatedCount = rows.filter((row) => row.status === 'Generated').length;
  const issuedCount = rows.filter((row) => row.status === 'Issued').length;

  const handleViewClick = (row) => setSelectedRow(row);

  const handlePreviewCertificate = (row) => {
    navigate('/hr-office/certificate-preview', {
      state: {
        clearance: {
          employeeName: row.employee,
          employeeId: row.employeeId,
          department: row.department,
          position: row.position || 'Software Developer',
          campus: row.campus || 'Main Campus',
          collegeInstitute: row.collegeInstitute || row.college || row.institute,
          employmentType: row.employmentType || 'Permanent',
          requestId: row.requestId,
          requestDate: row.requestDate,
          lastWorkingDate: row.lastWorkingDate || row.expectedLastWorkingDate,
          completedDate: row.completedDate || row.generatedDate,
          status: 'Completed',
          finalHRApproval: row.finalHRApproval === true,
          overallStatus: 'CERTIFICATE ISSUED',
          certificate: row.certificate,
          departmentClearances: row.clearanceSummary.map((item) => ({
            name: item.name,
            status: item.status.toUpperCase() === 'APPROVED' ? 'APPROVED' : 'CLEARED',
          })),
        },
      },
    });
  };

  const handleIssueToEmployee = (row) => {
    const issue = async () => {
      try {
        await axios.patch(`http://localhost:3000/api/hr-final-clearance/certificate/${row.clearanceId}/issue`);
        setRows((prev) => prev.map((item) => item.certificateNo === row.certificateNo ? { ...item, status: 'Issued' } : item));
        setSelectedRow((prev) => (prev ? { ...prev, status: 'Issued' } : prev));
      } catch (error) {
        console.error('Failed to issue certificate:', error);
      }
    };

    issue();
  };

  return (
    <>
      <div className="min-h-screen bg-[#edf1f5] p-6 text-slate-800">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Certificates</h1>
            <p className="mt-1 text-[11px] text-slate-500">This page lists all generated certificates.</p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard icon={<FileText size={20} />} label="Total Certificates" value={totalCertificates} sub="All certificates" tone="neutral" />
            <SummaryCard icon={<CheckCircle2 size={20} />} label="Generated" value={generatedCount} sub="Not yet issued" tone="blue" />
            <SummaryCard icon={<ShieldCheck size={20} />} label="Issued" value={issuedCount} sub="Issued to employees" tone="green" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] max-w-[360px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by employee name or certificate no..."
                  className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="appearance-none rounded-md border border-slate-200 bg-white px-3 py-2.5 pr-9 text-[12px] text-slate-700 focus:border-sky-400 focus:outline-none"
                >
                  {departments.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>

              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="appearance-none rounded-md border border-slate-200 bg-white px-3 py-2.5 pr-9 text-[12px] text-slate-700 focus:border-sky-400 focus:outline-none"
                >
                  <option value="All Status">All Status</option>
                  <option value="Generated">Generated</option>
                  <option value="Issued">Issued</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>

              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-600">
                <span>From Date</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-slate-700 outline-none" />
                <CalendarDays size={14} className="text-slate-400" />
              </div>

              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[12px] text-slate-600">
                <span>To Date</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent text-slate-700 outline-none" />
                <CalendarDays size={14} className="text-slate-400" />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full border-collapse bg-white text-left text-[12px]">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Certificate No</th>
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Employee ID</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold">Generated Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading certificates...</td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-500">No certificates found.</td>
                    </tr>
                  ) : (
                    filteredRows.map((row, index) => (
                      <tr key={`${row.certificateNo}-${index}`} className="border-t border-slate-200 text-slate-700 odd:bg-white even:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.certificateNo}</td>
                        <td className="px-4 py-3">{row.employee}</td>
                        <td className="px-4 py-3 text-slate-600">{row.employeeId}</td>
                        <td className="px-4 py-3 text-slate-600">{row.department}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(row.generatedDate)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
                              row.status === 'Generated' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleViewClick(row)}
                            className={`rounded-md px-3 py-1.5 text-[11px] font-semibold text-white ${
                              row.status === 'Generated' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-[#eef2f7] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div>
                <h2 className="text-[18px] font-bold text-slate-800">Certificate Details</h2>
                <p className="text-[11px] text-slate-500">Home / Certificates / View Details</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1.45fr_0.8fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-4 text-[13px] font-semibold text-slate-700">Certificate Information</div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px] text-slate-700">
                  <div className="font-medium text-slate-500">Certificate No:</div>
                  <div className="font-semibold text-slate-800">{selectedRow.certificateNo}</div>

                  <div className="font-medium text-slate-500">Employee:</div>
                  <div className="font-semibold text-slate-800">{selectedRow.employee}</div>

                  <div className="font-medium text-slate-500">Employee ID:</div>
                  <div className="font-semibold text-slate-800">{selectedRow.employeeId}</div>

                  <div className="font-medium text-slate-500">Department:</div>
                  <div className="font-semibold text-slate-800">{selectedRow.department}</div>

                  <div className="font-medium text-slate-500">Generated Date:</div>
                  <div className="font-semibold text-slate-800">{formatDate(selectedRow.generatedDate)}</div>

                  <div className="font-medium text-slate-500">Generated By:</div>
                  <div className="font-semibold text-slate-800">{selectedRow.generatedBy}</div>

                  <div className="font-medium text-slate-500">Status:</div>
                  <div className="font-semibold uppercase text-slate-800">{selectedRow.status}</div>
                </div>

                <div className="mt-5">
                  <div className="mb-3 text-[13px] font-semibold text-slate-700">Clearance Summary</div>
                  <div className="space-y-2">
                    {selectedRow.clearanceSummary.map((item, index) => {
                      const approved = item.status.toLowerCase() === 'approved' || item.status.toLowerCase() === 'cleared';
                      return (
                        <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
                            <span className={`flex h-4 w-4 items-center justify-center rounded-full ${approved ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                              <Check size={10} />
                            </span>
                            {item.name}
                          </div>
                          <span className={`text-[11px] font-semibold ${approved ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {approved ? 'Approved' : item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-4 text-[13px] font-semibold text-slate-700">Actions</div>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => handlePreviewCertificate(selectedRow)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <FileText size={14} />
                    Preview Certificate
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Download size={14} />
                    Download PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => handleIssueToEmployee(selectedRow)}
                    disabled={selectedRow.status === 'Issued'}
                    className="relative flex w-full items-center justify-center gap-2 rounded-full bg-[#2CC26B] px-3 py-2.5 text-[12px] font-bold text-white shadow-sm hover:bg-[#25ad5d]"
                  >
                    {selectedRow.status === 'Issued' ? 'Issued to Employee' : 'Issue to Employee'}
                    {selectedRow.status !== 'Issued' && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">5</span>}
                  </button>
                </div>
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="rounded border-[3px] border-[#1d3b82] bg-white p-2">
                    <div className="rounded border-2 border-[#1d3b82] p-3 text-[#1d3b82]">
                      <div className="border-b-2 border-[#1d3b82] pb-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <img src={universityLogo} alt="Bahir Dar University logo" className="h-10 w-10 object-contain" />
                          <div>
                            <div className="text-[11px] font-black">BAHIR DAR UNIVERSITY</div>
                            <div className="text-[7px] font-bold">Employee Clearance Management System</div>
                          </div>
                        </div>
                        <div className="mt-1 text-[6px] font-semibold uppercase">Campus / College / Institute: {selectedRow.campus || 'Main Campus'} / {selectedRow.collegeInstitute || selectedRow.college || selectedRow.institute || '—'}</div>
                        <div className="mt-2 text-[10px] font-black">EMPLOYEE CLEARANCE CERTIFICATE</div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 border border-slate-300 p-1.5 text-left text-[7px] text-slate-700">
                        <div>Request No: <strong>{selectedRow.requestId || selectedRow.clearanceId || '—'}</strong></div>
                        <div>Type: <strong>{selectedRow.clearanceType || 'Resignation'}</strong></div>
                        <div>Request Date: <strong>{formatDate(selectedRow.requestDate)}</strong></div>
                        <div>Last Working Date: <strong>{formatDate(selectedRow.lastWorkingDate || selectedRow.expectedLastWorkingDate)}</strong></div>
                        <div>Certificate No: <strong>{selectedRow.certificateNo}</strong></div>
                        <div>Completed Date: <strong>{formatDate(selectedRow.completedDate || selectedRow.generatedDate)}</strong></div>
                      </div>

                      <div className="mt-3 text-center text-[7px] text-slate-700">
                        <div>This is to certify that</div>
                        <div className="mt-1 text-[16px] font-black text-[#1d3b82]">{selectedRow.employee}</div>
                        <div className="mx-auto mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-left">
                          <div>Full Name: <strong>{selectedRow.employee}</strong></div>
                          <div>Employee ID: <strong>{selectedRow.employeeId}</strong></div>
                          <div>Department: <strong>{selectedRow.department}</strong></div>
                          <div>Position: <strong>{selectedRow.position || 'Software Developer'}</strong></div>
                          <div>Campus: <strong>{selectedRow.campus || 'Main Campus'}</strong></div>
                          <div>Employment Type: <strong>{selectedRow.employmentType || 'Permanent'}</strong></div>
                        </div>
                        <div className="mt-2 italic">has successfully completed all required clearance procedures at Bahir Dar University.</div>
                      </div>

                      <div className="mt-3 border border-slate-300 bg-slate-50 p-1.5 text-[7px] text-slate-700">
                        <div className="mb-1 grid grid-cols-2 border-b border-slate-300 pb-1 font-bold"><span>Office / Department</span><span className="text-right">Clearance Status</span></div>
                        {selectedRow.clearanceSummary.map((item, index) => (
                          <div key={`mini-${item.name}-${index}`} className="grid grid-cols-2 border-b border-slate-200 py-0.5 last:border-0"><span>{index + 1}. {item.name}</span><span className="text-right font-semibold text-emerald-700">{item.status}</span></div>
                        ))}
                      </div>

                      <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-center text-emerald-700">
                        <div className="text-[7px] font-bold uppercase">Final Clearance Status</div>
                        <div className="text-[10px] font-black">CLEARED / ISSUED</div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-[6px] text-slate-600">
                        <div>
                          <div>Final HR Officer</div>
                          <div className="mt-1 border-b border-slate-500 pb-1 font-semibold">{selectedRow.generatedBy || 'Final HR Officer'}</div>
                          <div className="mt-1">Signature: <span className="inline-block w-12 border-b border-slate-500" /></div>
                          <div className="mt-1">Date: <span className="inline-block w-12 border-b border-slate-500">{formatDate(selectedRow.completedDate || selectedRow.generatedDate)}</span></div>
                        </div>
                        <div className="text-center"><div>Official Stamp</div><div className="mx-auto mt-1 h-7 w-14 border border-dashed border-slate-400 pt-2 text-[5px] text-slate-400">STAMP</div><div className="mt-1">Issue Date: {formatDate(selectedRow.completedDate || selectedRow.generatedDate)}</div></div>
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}
    </>
  );
}

function SummaryCard({ icon, label, value, sub, tone }) {
  const toneClasses = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-medium text-slate-600">{label}</div>
          <div className="mt-2 text-[26px] font-bold leading-none text-slate-900">{value}</div>
          <div className="mt-2 text-[10px] text-slate-500">{sub}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 shadow-sm">{icon}</div>
      </div>
    </div>
  );
}
