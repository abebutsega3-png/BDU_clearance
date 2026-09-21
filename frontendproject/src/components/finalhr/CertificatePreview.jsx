import React, { useEffect, useMemo } from 'react';
import { useState } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, Eye, Printer, X } from 'lucide-react';
import universityLogo from '../../assets/image.png';

const formatDate = (value, fallback = '—') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const displayValue = (value, fallback = '—') => value || fallback;

const getOfficeSummary = (clearance) => {
  const offices = [
    { name: 'HR Office', status: 'APPROVED', approvedBy: clearance?.initialHRReviewedBy || clearance?.finalHROfficer || clearance?.hrManagerName, approvalDate: clearance?.initialHRReviewedAt || clearance?.finalHRApprovalDate },
    { name: 'Library', status: 'CLEARED' },
    { name: 'Finance', status: 'CLEARED', approvedBy: clearance?.financeReviewedBy, approvalDate: clearance?.financeReviewedAt },
    { name: 'Property Management', status: 'CLEARED', approvedBy: clearance?.propertyReviewedBy, approvalDate: clearance?.propertyReviewedAt },
    { name: 'ICT Center', status: 'CLEARED', approvedBy: clearance?.ictReviewedBy, approvalDate: clearance?.ictReviewedAt },
    { name: 'Department', status: 'CLEARED', approvedBy: clearance?.departmentReviewedBy, approvalDate: clearance?.departmentReviewedAt },
  ];

  const departmentClearances = Array.isArray(clearance?.departmentClearances) ? clearance.departmentClearances : [];

  if (departmentClearances.length) {
    return offices.map((office) => {
      const match = departmentClearances.find((item) => {
        const name = String(item?.name || item?.department || '').toLowerCase();
        return name.includes(office.name.toLowerCase().split(' ')[0]) || office.name.toLowerCase().includes(name);
      });

      return {
        ...office,
        status: match && ['APPROVED', 'CLEARED', 'COMPLETED'].includes(String(match.status || '').toUpperCase()) ? 'APPROVED' : office.status,
        approvedBy: office.approvedBy || match?.clearedBy || match?.approvedBy || match?.reviewedBy || match?.performedBy || match?.officerName || '—',
        approvalDate: office.approvalDate || match?.clearedDate || match?.completedAt || match?.reviewedAt || match?.timestamp || match?.updatedAt || '',
      };
    });
  }

  return offices.map((office) => ({
    ...office,
    status: ['APPROVED', 'CLEARED', 'COMPLETED'].includes(String(office.status || '').toUpperCase()) ? 'APPROVED' : String(office.status || '').toUpperCase(),
    approvedBy: office.approvedBy || '—',
    approvalDate: office.approvalDate || '',
  }));
};

export default function CertificatePreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const [clearance, setClearance] = useState(() => location.state?.clearance || {});
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [certificateImage, setCertificateImage] = useState('');

  const officeSummary = useMemo(() => getOfficeSummary(clearance), [clearance]);
  const employee = clearance.employee || {};
  const employeeName = displayValue(clearance.employeeName || employee.fullName, 'Employee');
  const employeeId = displayValue(clearance.employeeId || employee.employeeId);
  const department = displayValue(clearance.department || employee.department, 'Not assigned');
  const position = displayValue(clearance.position || employee.position, 'Not assigned');
  const campus = displayValue(clearance.campus || employee.campus, 'Main Campus');
  const employmentType = displayValue(clearance.employmentType || employee.employmentType, 'Permanent');
  const requestDate = clearance.requestDate || clearance.submissionDate;
  const lastWorkingDate = clearance.lastWorkingDate || clearance.expectedLastWorkingDate || employee.lastWorkingDate;
  const completedDate = clearance.completedDate || clearance.finalHRApprovalDate || (clearance.status === 'Completed' ? clearance.updatedAt : null);
  const collegeInstitute = displayValue(clearance.collegeInstitute || clearance.college || clearance.institute);
  const finalOfficer = displayValue(clearance.hrManagerName || clearance.finalHROfficer, 'Final HR Officer');
  const finalApproved = clearance?.status === 'Completed' && clearance?.finalHRApproval === true;
  const finalStatus = finalApproved ? 'CLEARED' : 'READY FOR CERTIFICATE';

  useEffect(() => {
    const certificateElement = document.getElementById('certificate-image-source');
    if (!certificateElement) return undefined;

    const frame = window.requestAnimationFrame(async () => {
      try {
        const canvas = await html2canvas(certificateElement, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
        });
        setCertificateImage(canvas.toDataURL('image/png'));
      } catch (error) {
        console.error('Unable to render certificate image:', error);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [clearance, officeSummary, finalStatus]);

  const handleBack = () => {
    if (location.state?.fromDetails) {
      navigate(-1);
      return;
    }
    navigate('/hr-office/final-hr-clearance');
  };

  const handleGenerateCertificate = async () => {
    if (!finalApproved) {
      setSaveError('Final HR approval is required before generating the certificate.');
      return;
    }
    if (clearance.certificate?.number) {
      setSaveError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const requestId = clearance.requestId || clearance._id;
    if (!requestId) {
      setSaveError('This clearance request has no valid ID.');
      return;
    }

    try {
      setSaving(true);
      setSaveError('');
      const { data } = await axios.post(`http://localhost:3000/api/hr-final-clearance/clearance/${requestId}/certificate`);
      const generatedCertificate = data?.certificate;
      if (generatedCertificate) {
        setClearance((current) => ({
          ...current,
          certificate: generatedCertificate,
          completedDate: generatedCertificate.generatedAt || current.completedDate,
          status: 'Completed',
          finalHRApproval: true,
        }));
        navigate('/hr-office/certificates', {
          replace: true,
          state: { generatedCertificateNo: generatedCertificate.number },
        });
      }
    } catch (error) {
      setSaveError(error.response?.data?.message || 'Unable to save certificate.');
    } finally {
      setSaving(false);
    }
  };

  const handleIssueCertificate = async () => {
    const certificateId = clearance.requestId || clearance._id;
    if (!certificateId || !clearance.certificate?.number) return;

    try {
      setIssuing(true);
      setSaveError('');
      const { data } = await axios.patch(`http://localhost:3000/api/hr-final-clearance/certificate/${certificateId}/issue`);
      if (data?.certificate) {
        setClearance((current) => ({ ...current, certificate: data.certificate }));
      }
    } catch (error) {
      setSaveError(error.response?.data?.message || 'Unable to issue certificate to employee.');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#edf1f5] text-slate-800">
      <main className="w-full flex-1 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Certificate Preview</h1>
            <p className="mt-1 text-[12px] text-slate-500">Please review the certificate below before generating and issuing.</p>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">🔔</button>
            <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">HR Officer</button>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <button onClick={handleBack} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">
            <ArrowLeft size={14} />
            Back to Details
          </button>
        </div>

        {certificateImage ? (
          <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <img src={certificateImage} alt="Generated employee clearance certificate" className="h-auto w-full" />
          </div>
        ) : null}

        <div id="certificate-image-source" className={`${certificateImage ? 'pointer-events-none absolute -left-[10000px] top-0 w-[980px]' : 'rounded-xl border-[3px] border-[#1d3b82] bg-white p-2 shadow-inner'} print-certificate`}>
          <div className="rounded-lg border-[2px] border-[#1d3b82] p-6">
            <div className="mb-6 border-b-2 border-[#1d3b82] pb-5 text-center text-[#1d3b82]">
              <div className="flex items-center justify-center gap-4">
                <img src={universityLogo} alt="Bahir Dar University logo" className="h-20 w-20 object-contain" />
                <div>
                  <div className="text-[22px] font-black tracking-wide">BAHIR DAR UNIVERSITY</div>
                  <div className="mt-1 text-[14px] font-bold tracking-wide">Employee Clearance Management System</div>
                </div>
              </div>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider">Campus / College / Institute: {campus} / {collegeInstitute}</div>
              <div className="mt-4 text-[20px] font-black tracking-wide">EMPLOYEE CLEARANCE CERTIFICATE</div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 border border-slate-300 p-4 text-[12px] text-slate-700">
              <div className="font-medium">Clearance Request No: <span className="font-bold text-slate-800">{displayValue(clearance.requestId || clearance._id)}</span></div>
              <div className="font-medium">Clearance Type: <span className="font-bold text-slate-800">{displayValue(clearance.clearanceType || clearance.reason, 'Resignation')}</span></div>
              <div className="font-medium">Request Date: <span className="font-bold text-slate-800">{formatDate(requestDate)}</span></div>
              <div className="font-medium">Last Working Date: <span className="font-bold text-slate-800">{formatDate(lastWorkingDate)}</span></div>
              <div className="font-medium">Certificate No: <span className="font-bold text-slate-800">{displayValue(clearance.certificate?.number || clearance.certificateNo, 'BDU/CLR/2026/00125')}</span></div>
              <div className="font-medium">Clearance Completed Date: <span className="font-bold text-slate-800">{formatDate(completedDate, 'XX/XX/YYYY')}</span></div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-[15px] font-medium text-slate-700">This is to certify that</p>
              <p className="mt-2 text-[30px] font-black tracking-tight text-[#1d3b82]">{employeeName}</p>
              <div className="mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-2 text-left text-[12px] text-slate-700">
                <p>Full Name: <span className="font-semibold">{employeeName}</span></p>
                <p>Employee ID: <span className="font-semibold">{employeeId}</span></p>
                <p>Department: <span className="font-semibold">{department}</span></p>
                <p>Position: <span className="font-semibold">{position}</span></p>
                <p>Campus: <span className="font-semibold">{campus}</span></p>
                <p>Employment Type: <span className="font-semibold">{employmentType}</span></p>
              </div>
              <p className="mt-4 text-[14px] font-medium italic text-slate-700">has successfully completed all required clearance procedures at Bahir Dar University.</p>
            </div>

            <div className="mt-8 border border-slate-300 bg-slate-50">
              <div className="grid grid-cols-[1.4fr_1fr_0.9fr_1fr] border-b border-slate-300 bg-slate-100 text-[12px] font-bold text-slate-700">
                <div className="px-3 py-2">Office / Department</div>
                <div className="px-3 py-2">Approved By</div>
                <div className="px-3 py-2">Approval Date</div>
                <div className="px-3 py-2 text-right">Clearance Status</div>
              </div>
              {officeSummary.map((office, index) => (
                <div key={`${office.name}-${index}`} className="grid grid-cols-[1.4fr_1fr_0.9fr_1fr] border-b border-slate-200 last:border-b-0 text-[12px] text-slate-700">
                  <div className="px-3 py-2 font-medium">{index + 1}. {office.name}</div>
                  <div className="px-3 py-2">{displayValue(office.approvedBy)}</div>
                  <div className="px-3 py-2">{formatDate(office.approvalDate)}</div>
                  <div className="px-3 py-2 text-right">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold ${office.status === 'APPROVED' || office.status === 'CLEARED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {office.status === 'APPROVED' || office.status === 'CLEARED' ? <CheckCircle2 size={12} /> : null}
                      {office.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
              <div className="text-[14px] font-bold uppercase tracking-wide text-emerald-700">Final Clearance Status</div>
              <div className="mt-2 flex items-center justify-center gap-3 text-[24px] font-black text-emerald-700"><CheckCircle2 size={25} />{finalStatus}</div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-12 text-[11px] text-slate-600">
              <div className="space-y-3">
                <div>Final HR Officer</div>
                <div className="border-b border-slate-500 pb-2 text-[14px] font-semibold text-slate-700">{finalOfficer}</div>
                <div>Signature: <span className="ml-2 inline-block w-40 border-b border-slate-500" /></div>
                <div>Date: <span className="ml-2 inline-block w-40 border-b border-slate-500">{formatDate(completedDate, 'XX/XX/YYYY')}</span></div>
              </div>
              <div className="space-y-3 text-center">
                <div>Official Stamp</div>
                <div className="mx-auto h-20 w-44 border-2 border-dashed border-slate-400 pt-8 text-slate-400">STAMP</div>
                <div>Issue Date: {formatDate(completedDate || new Date())}</div>
              </div>
            </div>
          </div>
        </div>

        {saveError && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-right text-[12px] text-red-700">{saveError}</div>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-100">
            <X size={14} />
            Cancel
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-100">
            <Printer size={14} />
            Preview PDF
          </button>
          {clearance.certificate?.number ? (
            <>
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-100">
                <Eye size={14} /> View Certificate
              </button>
              {!clearance.certificate?.issuedAt && (
                <button type="button" onClick={handleIssueCertificate} disabled={issuing} className="inline-flex items-center gap-2 rounded-lg bg-[#1AAE6F] px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-[#15995d] disabled:cursor-not-allowed disabled:opacity-60">
                  <Download size={14} /> {issuing ? 'Issuing...' : 'Issue to Employee'}
                </button>
              )}
            </>
          ) : (
            <button onClick={handleGenerateCertificate} disabled={saving || !finalApproved} className="inline-flex items-center gap-2 rounded-lg bg-[#1AAE6F] px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-[#15995d] disabled:cursor-not-allowed disabled:opacity-60">
              <Download size={14} />
              {saving ? 'Saving Certificate...' : 'Confirm & Generate Certificate'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
