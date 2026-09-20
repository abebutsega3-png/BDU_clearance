import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/authContext';
import EmployeeNavbar from './employeenavbar';
import EmployeeSidebar from './employeesidbar';
import EmployeeMyCertificates from './EmployeeMyCertificates';

export default function EmployeeDocuments() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const employeeId = user?.employeeId || user?.employee?.employeeId || user?._id;
    if (!employeeId) {
      setCertificates([]);
      setLoading(false);
      return;
    }

    const loadCertificates = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:3000/api/hr-final-clearance/certificates/employee/${encodeURIComponent(employeeId)}`,
        );
        setCertificates(data?.data || []);
      } catch (error) {
        console.error('Failed to load employee certificates:', error);
        setCertificates([]);
      } finally {
        setLoading(false);
      }
    };

    loadCertificates();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-100">
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
          <h1 className="text-2xl font-bold text-gray-900">My Certificates</h1>
          <p className="mt-1 text-sm text-gray-600">View and download certificates issued by the Human Resource Office.</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          {loading ? <p className="py-8 text-center text-sm text-gray-500">Loading certificates...</p> : <EmployeeMyCertificates certificates={certificates} />}
        </div>
      </main>
    </div>
  );
}
