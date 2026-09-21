import React, { useState } from 'react';
import axios from 'axios';
import { Download, Eye, Printer, Search, ShieldCheck, X } from 'lucide-react';
import jsPDF from 'jspdf';
import universityLogo from '../../assets/image.png';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const displayValue = (value, fallback = '—') => value || fallback;

const downloadCertificate = (certificate) => {
  const pdf = new jsPDF();
  const employeeName = certificate.employeeName || 'Employee';
  const fileName = `Employee_Clearance_${employeeName.replace(/[^a-z0-9]+/gi, '_')}_${certificate.certificateNo}.pdf`;
  pdf.setDrawColor(29, 59, 130);
  pdf.setLineWidth(1.5);
  pdf.rect(15, 15, 180, 267);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(29, 59, 130);
  pdf.setFontSize(17);
  pdf.text('BAHIR DAR UNIVERSITY', 105, 35, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text('EMPLOYEE CLEARANCE CERTIFICATE', 105, 43, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(35, 35, 35);
  pdf.setFontSize(11);
  pdf.text(`Certificate No: ${certificate.certificateNo}`, 25, 62);
  pdf.text(`Certificate Type: ${certificate.clearanceType || 'Employee Clearance'}`, 25, 70);
  pdf.text(`Issue Date: ${formatDate(certificate.issuedAt || certificate.completedDate)}`, 25, 78);
  pdf.text(`Employee Name: ${employeeName}`, 25, 92);
  pdf.text(`Employee ID: ${certificate.employeeId || '—'}`, 25, 100);
  pdf.text(`Department: ${certificate.department || '—'}`, 25, 108);
  pdf.text(`Position: ${certificate.position || '—'}`, 25, 116);
  pdf.text('Clearance Summary', 25, 134);
  (certificate.departmentClearances || []).forEach((item, index) => {
    pdf.text(`${item.name || item.office || item.department || 'Office'}: ${item.status || 'Cleared'}`, 32, 143 + (index * 8));
  });
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(22, 139, 83);
  pdf.text('FINAL STATUS: CLEARED / ISSUED', 25, 205);
  pdf.setTextColor(35, 35, 35);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Issued By: ${certificate.issuedBy || certificate.certificate?.generatedBy || certificate.hrManagerName || 'HR Officer'}`, 25, 255);
  pdf.text('Signature / Approval: ____________________', 25, 265);
  pdf.save(fileName);
};

export default function EmployeeMyCertificates({ certificates = [] }) {
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handlePrint = () => window.print();

  const handleVerify = async (certificate) => {
    setVerifying(true);
    try {
      const { data } = await axios.get(`http://localhost:3000/api/hr-final-clearance/certificates/verify/${encodeURIComponent(certificate.certificateNo)}`);
      setVerification(data);
    } catch (error) {
      setVerification({ valid: false, message: error.response?.data?.message || 'Unable to verify certificate.' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="mt-12">
      <h2 className="mb-2 text-lg font-bold text-gray-900">My Certificates</h2>
      <p className="mb-2 text-sm text-gray-600">Certificate List</p>
      <p className="mb-6 text-sm text-gray-600">Certificates issued to you by the Human Resource Office</p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Certificate No</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Certificate Type</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Issue Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {certificates.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No issued certificates are available yet.</td></tr>
            ) : certificates.map((certificate, index) => (
              <tr key={certificate.certificateNo || index} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-800">{certificate.certificateNo}</td>
                <td className="px-4 py-3 text-gray-800">{certificate.clearanceType || 'Employee Clearance'}</td>
                <td className="px-4 py-3 text-gray-800">{formatDate(certificate.completedDate)}</td>
                <td className="px-4 py-3"><span className="inline-block rounded bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">🟢 {String(certificate.status || 'ISSUED').toUpperCase()}</span></td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    <button type="button" onClick={() => setSelectedCertificate(certificate)} className="inline-flex items-center gap-1 rounded px-2 py-2 text-blue-600 hover:bg-blue-50"><Eye size={16} /> View</button>
                    <button type="button" onClick={() => downloadCertificate(certificate)} className="inline-flex items-center gap-1 rounded px-2 py-2 text-green-600 hover:bg-green-50"><Download size={16} /> Download</button>
                    <button type="button" onClick={() => handleVerify(certificate)} className="inline-flex items-center gap-1 rounded px-2 py-2 text-indigo-600 hover:bg-indigo-50"><Search size={16} /> Verify</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4 text-xs text-gray-600">Showing {certificates.length ? `1 to ${Math.min(3, certificates.length)}` : '0'} of {certificates.length} entries</div>

      {selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-[#eef2f7] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div><h2 className="text-xl font-bold text-slate-900">Certificate Details</h2><p className="text-xs text-slate-500">My Certificates / View Details</p></div>
              <button type="button" onClick={() => setSelectedCertificate(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.1fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-bold text-slate-800">Certificate Information</h3>
                <div className="grid grid-cols-[145px_1fr] gap-y-3 text-xs">
                  <span className="text-slate-500">Certificate No:</span><strong>{selectedCertificate.certificateNo}</strong>
                  <span className="text-slate-500">Certificate Type:</span><strong>{selectedCertificate.clearanceType || 'Employee Clearance'}</strong>
                  <span className="text-slate-500">Employee Name:</span><strong>{selectedCertificate.employeeName || '—'}</strong>
                  <span className="text-slate-500">Employee ID:</span><strong>{selectedCertificate.employeeId || '—'}</strong>
                  <span className="text-slate-500">Department:</span><strong>{selectedCertificate.department || '—'}</strong>
                  <span className="text-slate-500">Position:</span><strong>{selectedCertificate.position || '—'}</strong>
                  <span className="text-slate-500">Issue Date:</span><strong>{formatDate(selectedCertificate.issuedAt || selectedCertificate.completedDate)}</strong>
                  <span className="text-slate-500">Issued By:</span><strong>{selectedCertificate.issuedBy || selectedCertificate.hrManagerName || 'HR Officer'}</strong>
                  <span className="text-slate-500">Status:</span><strong className="text-emerald-700">ISSUED</strong>
                </div>

                <h3 className="mb-3 mt-7 text-sm font-bold text-slate-800">Clearance Summary</h3>
                <div className="space-y-2">
                  {(selectedCertificate.departmentClearances || []).map((item, index) => (
                    <div key={`${item.name || item.office || item.department}-${index}`} className="flex justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><span>✓ {item.name || item.office || item.department || 'Office'}</span><strong className="text-emerald-700">{item.status || 'Cleared'}</strong></div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-bold text-slate-800">Certificate Preview</h3>
                <div className="rounded-lg border-[3px] border-[#1d3b82] bg-white p-2">
                  <div className="rounded border-2 border-[#1d3b82] p-4 text-[#1d3b82]">
                    <div className="border-b-2 border-[#1d3b82] pb-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <img src={universityLogo} alt="Bahir Dar University logo" className="h-12 w-12 object-contain" />
                        <div>
                          <div className="text-base font-black">BAHIR DAR UNIVERSITY</div>
                          <div className="text-[9px] font-bold">Employee Clearance Management System</div>
                        </div>
                      </div>
                      <div className="mt-2 text-[8px] font-semibold uppercase">Campus / College / Institute: {displayValue(selectedCertificate.campus, 'Main Campus')} / {displayValue(selectedCertificate.collegeInstitute || selectedCertificate.college || selectedCertificate.institute)}</div>
                      <div className="mt-2 text-[12px] font-black">EMPLOYEE CLEARANCE CERTIFICATE</div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border border-slate-300 p-2 text-left text-[9px] text-slate-700">
                      <div>Clearance Request No: <strong>{displayValue(selectedCertificate.requestId)}</strong></div>
                      <div>Clearance Type: <strong>{displayValue(selectedCertificate.clearanceType, 'Resignation')}</strong></div>
                      <div>Request Date: <strong>{formatDate(selectedCertificate.requestDate)}</strong></div>
                      <div>Last Working Date: <strong>{formatDate(selectedCertificate.lastWorkingDate || selectedCertificate.expectedLastWorkingDate)}</strong></div>
                      <div>Certificate No: <strong>{displayValue(selectedCertificate.certificateNo)}</strong></div>
                      <div>Completed Date: <strong>{formatDate(selectedCertificate.completedDate)}</strong></div>
                    </div>

                    <div className="mt-4 text-center text-slate-700">
                      <div className="text-[9px]">This is to certify that</div>
                      <div className="mt-1 text-xl font-black text-[#1d3b82]">{displayValue(selectedCertificate.employeeName)}</div>
                      <div className="mx-auto mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-left text-[9px]">
                        <div>Full Name: <strong>{displayValue(selectedCertificate.employeeName)}</strong></div>
                        <div>Employee ID: <strong>{displayValue(selectedCertificate.employeeId)}</strong></div>
                        <div>Department: <strong>{displayValue(selectedCertificate.department)}</strong></div>
                        <div>Position: <strong>{displayValue(selectedCertificate.position)}</strong></div>
                        <div>Campus: <strong>{displayValue(selectedCertificate.campus, 'Main Campus')}</strong></div>
                        <div>Employment Type: <strong>{displayValue(selectedCertificate.employmentType, 'Permanent')}</strong></div>
                      </div>
                      <div className="mt-3 text-[9px] italic">has successfully completed all required clearance procedures at Bahir Dar University.</div>
                    </div>

                    <div className="mt-4 border border-slate-300 bg-slate-50 p-2 text-left text-[9px] text-slate-700">
                      <div className="mb-1 grid grid-cols-2 border-b border-slate-300 pb-1 font-bold"><span>Office / Department</span><span className="text-right">Clearance Status</span></div>
                      {(selectedCertificate.departmentClearances || []).map((item, index) => <div key={`preview-${index}`} className="grid grid-cols-2 border-b border-slate-200 py-1 last:border-0"><span>{index + 1}. {item.name || item.office || item.department || 'Office'}</span><strong className="text-right text-emerald-700">{item.status || 'Cleared'}</strong></div>)}
                    </div>

                    <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-2 py-2 text-center text-emerald-700">
                      <div className="text-[9px] font-bold uppercase">Final Clearance Status</div>
                      <div className="text-sm font-black">CLEARED / ISSUED</div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-[8px] text-slate-600">
                      <div>
                        <div>Final HR Officer</div>
                        <div className="mt-2 border-b border-slate-500 pb-1 font-semibold">{displayValue(selectedCertificate.issuedBy || selectedCertificate.certificate?.generatedBy || selectedCertificate.hrManagerName, 'Final HR Officer')}</div>
                        <div className="mt-2">Signature: <span className="inline-block w-16 border-b border-slate-500" /></div>
                        <div className="mt-2">Date: <span className="inline-block w-16 border-b border-slate-500">{formatDate(selectedCertificate.completedDate)}</span></div>
                      </div>
                      <div className="text-center">
                        <div>Official Stamp</div>
                        <div className="mx-auto mt-1 h-10 w-20 border border-dashed border-slate-400 pt-3 text-[7px] text-slate-400">STAMP</div>
                        <div className="mt-2">Issue Date: {formatDate(selectedCertificate.completedDate)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => downloadCertificate(selectedCertificate)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"><Download size={14} /> Download PDF</button>
                  <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Printer size={14} /> Print</button>
                  <button type="button" onClick={() => handleVerify(selectedCertificate)} disabled={verifying} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"><ShieldCheck size={14} /> {verifying ? 'Verifying...' : 'Verify Certificate'}</button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={() => setSelectedCertificate(null)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">← Back to My Certificates</button></div>
          </div>
        </div>
      )}

      {verification && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Certificate Verification</h2>
              <button type="button" onClick={() => setVerification(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {verification.valid ? (
              <div className="mt-5 space-y-2 text-sm">
                <p className="font-semibold text-emerald-700">Valid issued certificate</p>
                <p><span className="text-slate-500">Certificate No:</span> {verification.certificate.certificateNo}</p>
                <p><span className="text-slate-500">Employee:</span> {verification.certificate.employeeName}</p>
                <p><span className="text-slate-500">Issued By:</span> {verification.certificate.issuedBy}</p>
                <p><span className="text-slate-500">Issue Date:</span> {formatDate(verification.certificate.issuedAt)}</p>
                <p className="font-semibold text-emerald-700">Status: ISSUED</p>
              </div>
            ) : <p className="mt-5 text-sm text-red-600">{verification.message}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
