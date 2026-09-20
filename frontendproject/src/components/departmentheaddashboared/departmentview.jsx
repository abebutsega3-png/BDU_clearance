import { useState } from "react";

const requests = [
  {
    id: 1,
    employeeId: "EMP-001",
    employeeName: "Abebe Kebede",
    department: "Information Technology",
    position: "Software Engineer",
    requestDate: "08/25/2026",
    clearanceType: "Separation Clearance",
    status: "Pending",
    reason: "",
  },
  {
    id: 2,
    employeeId: "EMP-002",
    employeeName: "Hana Alemu",
    department: "Information Technology",
    position: "IT Support",
    requestDate: "08/24/2026",
    clearanceType: "Separation Clearance",
    status: "Under Review",
    reason: "",
  },
  {
    id: 3,
    employeeId: "EMP-003",
    employeeName: "Dawit Tadesse",
    department: "Information Technology",
    position: "System Analyst",
    requestDate: "08/23/2026",
    clearanceType: "Separation Clearance",
    status: "Approved",
    reason: "",
  },
  {
    id: 4,
    employeeId: "EMP-004",
    employeeName: "Meron Getachew",
    department: "Information Technology",
    position: "Database Administrator",
    requestDate: "08/22/2026",
    clearanceType: "Separation Clearance",
    status: "Returned",
    reason: "Department property has not been returned.",
  },
  {
    id: 5,
    employeeId: "EMP-005",
    employeeName: "Selam Tesfaye",
    department: "Information Technology",
    position: "Network Engineer",
    requestDate: "08/20/2026",
    clearanceType: "Separation Clearance",
    status: "Completed",
    reason: "",
  },
];

export default function ClearanceRequests() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestsData, setRequestsData] = useState(requests);
  const [returnReason, setReturnReason] = useState("");
  const [showReturnBox, setShowReturnBox] = useState(false);

  // Status change helper
  const updateStatus = (id, newStatus) => {
    setRequestsData((prev) =>
      prev.map((request) =>
        request.id === id
          ? { ...request, status: newStatus }
          : request
      )
    );

    setSelectedRequest((prev) =>
      prev ? { ...prev, status: newStatus } : prev
    );
  };

  // View button
  const handleView = (request) => {
    setSelectedRequest(request);
    setShowReturnBox(false);
    setReturnReason("");
  };

  // Start Review
  const handleStartReview = () => {
    updateStatus(selectedRequest.id, "Under Review");
  };

  // Approve
  const handleApprove = () => {
    const confirmApprove = window.confirm(
      "Are you sure you want to approve this clearance request?"
    );

    if (!confirmApprove) return;

    updateStatus(selectedRequest.id, "Approved");
  };

  // Return
  const handleReturn = () => {
    if (!returnReason.trim()) {
      alert("Please enter a return reason.");
      return;
    }

    setRequestsData((prev) =>
      prev.map((request) =>
        request.id === selectedRequest.id
          ? {
              ...request,
              status: "Returned",
              reason: returnReason,
            }
          : request
      )
    );

    setSelectedRequest((prev) => ({
      ...prev,
      status: "Returned",
      reason: returnReason,
    }));

    setShowReturnBox(false);
    setReturnReason("");
  };

  // Review Again
  const handleReviewAgain = () => {
    updateStatus(selectedRequest.id, "Under Review");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Clearance Requests
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Home / Clearance Requests
        </p>
      </div>

      {/* Status Tabs */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">

        {[
          "All Requests",
          "Pending",
          "Under Review",
          "Approved",
          "Returned",
          "Completed",
        ].map((status) => (
          <button
            key={status}
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm hover:border-teal-500"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">
                {status}
              </span>

              <span className="rounded-md bg-slate-700 px-2 py-1 text-xs font-bold text-white">
                {status === "All Requests"
                  ? requestsData.length
                  : requestsData.filter(
                      (r) => r.status === status
                    ).length}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

          <input
            type="text"
            placeholder="Search by employee name or ID..."
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-600"
          />

          <select className="rounded-xl border border-slate-200 px-4 py-3 outline-none">
            <option>All Clearance Types</option>
            <option>Separation Clearance</option>
            <option>Transfer Clearance</option>
          </select>

          <input
            type="date"
            className="rounded-xl border border-slate-200 px-4 py-3"
          />

          <input
            type="date"
            className="rounded-xl border border-slate-200 px-4 py-3"
          />

          <div className="flex gap-2">
            <button className="rounded-xl bg-teal-700 px-5 py-3 font-medium text-white hover:bg-teal-800">
              Filter
            </button>

            <button className="rounded-xl border border-slate-300 px-5 py-3 text-slate-700 hover:bg-slate-50">
              Reset
            </button>
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">

            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-sm text-slate-700">

                <th className="px-5 py-4">#</th>
                <th className="px-5 py-4">Employee ID</th>
                <th className="px-5 py-4">Employee Name</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Position</th>
                <th className="px-5 py-4">Request Date</th>
                <th className="px-5 py-4">Clearance Type</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>

              </tr>
            </thead>

            <tbody>

              {requestsData.map((request, index) => (
                <tr
                  key={request.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >

                  <td className="px-5 py-4">
                    {index + 1}
                  </td>

                  <td className="px-5 py-4 font-medium">
                    {request.employeeId}
                  </td>

                  <td className="px-5 py-4">
                    {request.employeeName}
                  </td>

                  <td className="px-5 py-4">
                    {request.department}
                  </td>

                  <td className="px-5 py-4">
                    {request.position}
                  </td>

                  <td className="px-5 py-4">
                    {request.requestDate}
                  </td>

                  <td className="px-5 py-4">
                    {request.clearanceType}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={request.status} />
                  </td>

                  {/* ACTION */}
                  <td className="px-5 py-4">

                    <button
                      onClick={() => handleView(request)}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    >
                      👁 View
                    </button>

                  </td>

                </tr>
              ))}

            </tbody>

          </table>
        </div>

      </div>

      {/* VIEW MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-5">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Clearance Request Details
                </h2>

                <p className="text-sm text-slate-500">
                  Request ID: CLR-{selectedRequest.id
                    .toString()
                    .padStart(4, "0")}
                </p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>

            </div>

            {/* Modal Body */}
            <div className="space-y-6 p-6">

              {/* Status */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <span className="font-semibold text-slate-700">
                  Current Status
                </span>

                <StatusBadge status={selectedRequest.status} />

              </div>

              {/* Employee Information */}
              <section>

                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Employee Information
                </h3>

                <div className="grid gap-4 rounded-xl border border-slate-200 p-5 md:grid-cols-2">

                  <Info label="Employee ID" value={selectedRequest.employeeId} />
                  <Info label="Full Name" value={selectedRequest.employeeName} />
                  <Info label="Department" value={selectedRequest.department} />
                  <Info label="Position" value={selectedRequest.position} />

                </div>

              </section>

              {/* Request Information */}
              <section>

                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Request Information
                </h3>

                <div className="grid gap-4 rounded-xl border border-slate-200 p-5 md:grid-cols-2">

                  <Info
                    label="Clearance Type"
                    value={selectedRequest.clearanceType}
                  />

                  <Info
                    label="Request Date"
                    value={selectedRequest.requestDate}
                  />

                </div>

              </section>

              {/* Clearance Items */}
              <section>

                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Department Clearance Items
                </h3>

                <div className="space-y-3">

                  {[
                    "Department Property",
                    "Documents Submission",
                    "Financial Obligation",
                    "Other Requirements",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                    >

                      <span>{item}</span>

                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Pending
                      </span>

                    </div>
                  ))}

                </div>

              </section>

              {/* Return Reason */}
              {selectedRequest.reason && (
                <section>

                  <h3 className="mb-3 text-lg font-semibold">
                    Return Reason
                  </h3>

                  <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    {selectedRequest.reason}
                  </div>

                </section>
              )}

              {/* Return Form */}
              {showReturnBox && (
                <section className="rounded-xl border border-red-200 bg-red-50 p-5">

                  <h3 className="mb-3 font-semibold text-red-800">
                    Return Clearance Request
                  </h3>

                  <textarea
                    value={returnReason}
                    onChange={(e) =>
                      setReturnReason(e.target.value)
                    }
                    placeholder="Enter reason for returning this request..."
                    rows="4"
                    className="w-full rounded-xl border border-red-200 bg-white p-3 outline-none focus:border-red-500"
                  />

                  <div className="mt-3 flex justify-end gap-2">

                    <button
                      onClick={() => setShowReturnBox(false)}
                      className="rounded-lg border px-4 py-2"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleReturn}
                      className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white"
                    >
                      Confirm Return
                    </button>

                  </div>

                </section>
              )}

            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap justify-end gap-3 border-t bg-slate-50 px-6 py-5">

              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700"
              >
                Close
              </button>

              {/* PENDING */}
              {selectedRequest.status === "Pending" && (
                <button
                  onClick={handleStartReview}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
                >
                  Start Review
                </button>
              )}

              {/* UNDER REVIEW */}
              {selectedRequest.status === "Under Review" && (
                <>
                  <button
                    onClick={() => setShowReturnBox(true)}
                    className="rounded-xl bg-red-600 px-5 py-2.5 font-medium text-white hover:bg-red-700"
                  >
                    Return Request
                  </button>

                  <button
                    onClick={handleApprove}
                    className="rounded-xl bg-green-600 px-5 py-2.5 font-medium text-white hover:bg-green-700"
                  >
                    Approve Clearance
                  </button>
                </>
              )}

              {/* APPROVED */}
              {selectedRequest.status === "Approved" && (
                <button
                  onClick={() =>
                    alert("Clearance history will be displayed here.")
                  }
                  className="rounded-xl bg-slate-700 px-5 py-2.5 font-medium text-white"
                >
                  View History
                </button>
              )}

              {/* RETURNED */}
              {selectedRequest.status === "Returned" && (
                <button
                  onClick={handleReviewAgain}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white"
                >
                  Review Again
                </button>
              )}

              {/* COMPLETED */}
              {selectedRequest.status === "Completed" && (
                <button
                  onClick={() =>
                    alert("Clearance history will be displayed here.")
                  }
                  className="rounded-xl bg-slate-700 px-5 py-2.5 font-medium text-white"
                >
                  View History
                </button>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


/* ---------------------------
   Helper Components
---------------------------- */

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}


function StatusBadge({ status }) {

  const styles = {
    Pending:
      "bg-amber-100 text-amber-700",

    "Under Review":
      "bg-blue-100 text-blue-700",

    Approved:
      "bg-emerald-100 text-emerald-700",

    Returned:
      "bg-red-100 text-red-700",

    Completed:
      "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}