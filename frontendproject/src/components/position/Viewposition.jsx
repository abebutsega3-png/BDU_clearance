import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiBriefcase, FiEye } from 'react-icons/fi';

const DetailCard = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-medium text-slate-800">{value || 'Not provided'}</p>
  </div>
);

export default function ViewPosition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPosition = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3000/api/positions/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPosition(response.data.position);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load position details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPosition();
    }
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading position details...
        </div>
      </main>
    );
  }

  if (error || !position) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
          {error || 'Position not found.'}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/positions')}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 font-medium text-red-700 hover:bg-red-50"
            >
              <FiArrowLeft size={14} /> Back to Position List
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Position Information</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">View Position</h1>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/positions')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            <FiArrowLeft size={14} /> Back to Position List
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FiBriefcase className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{position.title || 'Untitled Position'}</h2>
              <p className="text-sm text-slate-500">Position details and status</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard label="Position Title" value={position.title} />
            <DetailCard label="Position Code" value={position.code} />
            <DetailCard label="Department" value={position.department} />
            <DetailCard
              label="Status"
              value={
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    position.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {position.status || 'Active'}
                </span>
              }
            />
            <div className="md:col-span-2">
              <DetailCard label="Description" value={position.description} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
