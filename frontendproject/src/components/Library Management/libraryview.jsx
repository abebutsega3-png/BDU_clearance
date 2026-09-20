import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, RotateCcw, History } from 'lucide-react';

export default function ClearanceViewActions({ status, initialData, onStartReview, onApprove, onReturn, onReviewAgain, onViewHistory }) {
  const [verificationResult, setVerificationResult] = useState('Clear');
  const [comment, setComment] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleReturnSubmit = () => {
    if (!returnReason.trim()) {
      setErrorMsg('Return reason is required.');
      return;
    }
    setErrorMsg('');
    onReturn(returnReason);
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs text-slate-700">
      <h2 className="font-bold text-slate-900 border-b border-slate-100 pb-2">
        Action & Decision Center
      </h2>

      {/* 1. STATUS: Pending -> ACTION: Start Review */}
      {status === 'Pending' && (
        <div className="flex justify-between items-center bg-amber-50 p-4 rounded-lg border border-amber-200">
          <span className="text-amber-800 font-semibold">
            Status: Pending — Request is waiting for review.
          </span>
          <button
            onClick={onStartReview}
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Play size={14} />
            <span>Start Review</span>
          </button>
        </div>
      )}

      {/* 2. STATUS: Under Review -> ACTIONS: Approve Clearance OR Return Request */}
      {status === 'Under Review' && (
        <div className="space-y-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Verification Result</label>
            <select
              value={verificationResult}
              onChange={(e) => setVerificationResult(e.target.value)}
              className="w-full md:w-1/3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-800 outline-none focus:border-teal-600"
            >
              <option value="Clear">Clear</option>
              <option value="Not Clear">Not Clear</option>
            </select>
          </div>

          {verificationResult === 'Clear' ? (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Comment</label>
              <textarea
                rows={3}
                placeholder="No outstanding library obligations."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-teal-600"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => onApprove(comment)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <CheckCircle2 size={14} />
                  <span>Approve Clearance</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Return Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Specify the reason why clearance is returned..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-red-500"
              />
              {errorMsg && <p className="text-red-500 text-[11px] mt-1">{errorMsg}</p>}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleReturnSubmit}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <XCircle size={14} />
                  <span>Return Request</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. STATUS: Approved -> ACTION: View History */}
      {status === 'Approved' && (
        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-bold text-emerald-800">Status: Approved</p>
            {initialData?.comment && (
              <p className="text-slate-600 mt-1"><span className="font-semibold">Comment:</span> {initialData.comment}</p>
            )}
          </div>
          <button
            onClick={onViewHistory}
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-colors"
          >
            <History size={14} />
            <span>View History</span>
          </button>
        </div>
      )}

      {/* 4. STATUS: Returned -> ACTION: Review Again */}
      {status === 'Returned' && (
        <div className="p-4 bg-red-50/60 border border-red-200 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-bold text-red-800">Status: Returned</p>
            {initialData?.returnReason && (
              <p className="text-red-600 mt-1"><span className="font-semibold">Reason:</span> {initialData.returnReason}</p>
            )}
          </div>
          <button
            onClick={onReviewAgain}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <RotateCcw size={14} />
            <span>Review Again</span>
          </button>
        </div>
      )}

      {/* 5. STATUS: Completed -> ACTION: View History */}
      {status === 'Completed' && (
        <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-bold text-slate-800">Status: Completed</p>
            <p className="text-slate-500 mt-0.5">This clearance process has been finalized.</p>
          </div>
          <button
            onClick={onViewHistory}
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-colors"
          >
            <History size={14} />
            <span>View History</span>
          </button>
        </div>
      )}
    </div>
  );
}