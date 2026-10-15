import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/authContext';
import { useEmployeeLanguage } from './EmployeeLanguage';
import EmployeeNavbar from './employeenavbar';
import EmployeeSidebar from './employeesidbar';
import EmployeeMyCertificates from './EmployeeMyCertificates';

export default function EmployeeDocuments() {
  const { user } = useAuth();
  const { resolvedTheme, t } = useEmployeeLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000')
    .replace(/\/api\/clearance\/?$/, '')
    .replace(/\/api\/?$/, '');

  useEffect(() => {
    const employeeId = user?.employeeId || user?.employee?.employeeId || user?._id || user?.id;
    if (!employeeId) {
      setCertificates([]);
      setLoading(false);
      setError('Unable to identify your employee account.');
      return undefined;
    }

    const controller = new AbortController();
    const loadCertificates = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(
          `${apiBaseUrl}/api/hr-final-clearance/certificates/employee/${encodeURIComponent(employeeId)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
          },
        );
        if (!data?.success || !Array.isArray(data.data)) {
          throw new Error(data?.message || 'The server returned an invalid certificate list.');
        }
        setCertificates(data.data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load employee certificates:', error);
          setError(error.response?.data?.message || 'Unable to load your certificates. Please try again later.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadCertificates();
    return () => controller.abort();
  }, [apiBaseUrl, user?._id, user?.employee?.employeeId, user?.employeeId]);

  return (
    <div className={`employee-dashboard min-h-screen ${resolvedTheme === 'dark' ? 'employee-theme-dark' : 'bg-slate-100'}`}>
      <div className="hidden lg:block"><EmployeeSidebar /></div>
      {menuOpen && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} />
          <div className="relative z-50 lg:hidden"><EmployeeSidebar onNavigate={() => setMenuOpen(false)} /></div>
        </>
      )}
      <EmployeeNavbar onMenuClick={() => setMenuOpen(true)} />
      <main className="p-4 md:p-8 lg:ml-72">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('My Certificates')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('View and download certificates issued by the Human Resource Office.')}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          {loading ? <p className="py-8 text-center text-sm text-gray-500">{t('Loading certificates...')}</p> : error ? <p role="alert" className="py-8 text-center text-sm text-red-600">{t(error)}</p> : <EmployeeMyCertificates certificates={certificates} apiBaseUrl={apiBaseUrl} />}
        </div>
      </main>
    </div>
  );
}
