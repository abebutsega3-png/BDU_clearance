import ClearanceRequest from "../models/clearance.js";
import Employee from "../models/employee.js";
import FinancialRecord from "../models/financedashboared.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

const createRoleNotification = async ({
  role,
  type,
  title,
  message,
  requestId,
  actionText = "View Request",
  actionLink = "/finance-office/requests",
  relatedAssetId = null,
}) => {
  const officers = await User.find({ role: { $regex: `^${role}$`, $options: "i" } }).select("_id name");

  if (!officers.length) {
    return [];
  }

  const docs = officers.map((officer) => ({
    recipientId: officer._id,
    targetName: officer.name || role,
    title,
    message,
    type,
    actionText,
    actionLink,
    relatedRequestId: requestId || null,
    clearanceRequestId: requestId || null,
    relatedAssetId,
    isRead: false,
  }));

  return Notification.insertMany(docs);
};

const notifyEmployee = async ({ request, type, title, message }) => {
  const employeeId = String(request.employeeId || '').trim();
  const employeeName = String(request.employeeName || '').trim();
  const employeeFilter = employeeId
    ? { employeeId: { $regex: `^${employeeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
    : employeeName
      ? { name: { $regex: `^${employeeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
      : null;
  const employee = employeeFilter
    ? await User.findOne(employeeFilter).select('_id name employeeId')
    : null;
  if (!employee) return null;

  return Notification.create({
    recipientId: employee._id,
    targetName: employee.name || employeeName || 'Employee',
    employeeId: employee.employeeId || employeeId,
    title,
    message,
    type,
    actionText: 'View Clearance',
    actionLink: '/employee/my-clearance',
    relatedRequestId: request.requestId || String(request._id),
    clearanceRequestId: request.requestId || String(request._id),
    isRead: false,
  });
};

const updateFinanceWorkflow = (request, status, comment = '') => {
  const workflow = Array.isArray(request.workflow) ? [...request.workflow] : [];
  const financeIndex = workflow.findIndex((step) => /finance/i.test(step.office || step.name || ''));
  const financeStep = {
    ...(financeIndex >= 0 ? workflow[financeIndex] : { office: 'Finance Office' }),
    status,
    updatedAt: new Date(),
    clearedBy: status === 'Completed' ? 'Finance Officer' : '',
    clearedDate: status === 'Completed' ? new Date() : null,
    comment,
    remarks: comment,
    returnReason: status === 'Returned' ? comment : '',
  };

  if (financeIndex >= 0) workflow[financeIndex] = financeStep;
  else workflow.push(financeStep);
  request.workflow = workflow;
};

const getClearanceProgress = (request) => {
  const statusByOffice = {
    'department head': request.departmentStatus,
    'finance office': request.financeStatus,
    'property / asset office': request.propertyStatus,
    'property office': request.propertyStatus,
    'ict office': request.ictStatus,
    library: request.libraryStatus,
  };
  const offices = (Array.isArray(request.requiredOffices) ? request.requiredOffices : Object.keys(statusByOffice))
    .filter((office) => !/final hr/i.test(office));
  const completed = offices.filter((office) => {
    const workflowStep = request.workflow?.find((step) => String(step.office || '').toLowerCase() === String(office).toLowerCase());
    const status = statusByOffice[String(office).toLowerCase()] || workflowStep?.status;
    return ['approved', 'completed', 'cleared'].includes(String(status || '').toLowerCase());
  }).length;
  return `${completed}/${offices.length || 5}`;
};

export const notifyFinanceOfficers = async ({
  type,
  employeeName,
  requestId,
  department = "",
  clearanceReason = "",
  daysPending = 0,
  outstandingAmount = 0,
}) => {
  const normalizedRequestId = requestId || "";

  const templates = {
    NEW_REQUEST: {
      title: "New Finance Clearance Request",
      message: `${employeeName || "An employee"}'s clearance request requires financial review.`,
      actionText: "View Request",
      actionLink: "/finance-office/requests",
    },
    REQUEST_ASSIGNED: {
      title: "Clearance Request Assigned",
      message: `Clearance request ${normalizedRequestId || "this request"} has been assigned to you for review.`,
      actionText: "Review",
      actionLink: "/finance-office/requests",
    },
    PENDING_REMINDER: {
      title: "Clearance Review Reminder",
      message: `Finance clearance request ${normalizedRequestId || "this request"} has been pending for ${daysPending || 5} days.`,
      actionText: "Review Now",
      actionLink: "/finance-office/requests",
    },
    OBLIGATION_FOUND: {
      title: "Financial Obligation Found",
      message: `${employeeName || "An employee"} has an outstanding financial obligation of ${Number(outstandingAmount || 0).toLocaleString()} ETB.`,
      actionText: "View Details",
      actionLink: "/finance-office/requests",
    },
    CORRECTION_REQUIRED: {
      title: "Clearance Requires Attention",
      message: `Finance clearance request ${normalizedRequestId || "this request"} requires additional information.`,
      actionText: "View Request",
      actionLink: "/finance-office/requests",
    },
    CLEARANCE_READY_FOR_FINANCE: {
      title: "Clearance Ready for Finance Review",
      message: `${employeeName || "An employee"}'s clearance request is ready for Finance review.`,
      actionText: "View Request",
      actionLink: "/finance-office/requests",
    },
    REQUEST_RETURNED_TO_FINANCE: {
      title: "Request Returned to Finance",
      message: `${employeeName || "An employee"}'s clearance request has returned to Finance for review.`,
      actionText: "View Request",
      actionLink: "/finance-office/requests",
    },
    EMPLOYEE_UPDATED_REQUEST: {
      title: "Employee Updated Request",
      message: `${employeeName || "An employee"} resolved the issue and resubmitted the clearance request.`,
      actionText: "Review Request",
      actionLink: "/finance-office/requests",
    },
    FINANCE_APPROVED: {
      title: "Finance Clearance Approved",
      message: `${employeeName || "An employee"}'s finance clearance was successfully completed.`,
      actionText: "View Request",
      actionLink: "/finance-office/requests",
    },
    FINANCE_RETURNED: {
      title: "Finance Clearance Returned",
      message: `${employeeName || "An employee"}'s clearance request was returned by Finance.`,
      actionText: "View Request",
      actionLink: "/finance-office/requests",
    },
    CLEARANCE_COMPLETED: {
      title: "Clearance Completed",
      message: `${employeeName || "An employee"}'s required office clearances are complete and the request is moving to final HR review.`,
      actionText: "View Request",
      actionLink: "/finance-office/requests",
    },
    FINAL_HR_CLEARANCE_COMPLETED: {
      title: "Final HR Clearance Completed",
      message: `Final HR clearance for ${employeeName || "an employee"} has been completed.`,
      actionText: "View Request",
      actionLink: "/finance-office/requests",
    },
    CERTIFICATE_ISSUED: {
      title: "Certificate Issued",
      message: `The clearance certificate for ${employeeName || "an employee"} has been issued.`,
      actionText: "View Request",
      actionLink: "/finance-office/requests",
    },
  };

  const template = templates[type];
  if (!template) {
    return [];
  }

  return createRoleNotification({
    role: "Finance Officer",
    type,
    title: template.title,
    message: template.message,
    requestId: normalizedRequestId,
    actionText: template.actionText,
    actionLink: template.actionLink,
    relatedAssetId: null,
  });
};

export const notifyHrOfficersOfFinanceDecision = async ({ type, employeeName, requestId, reason = '', request }) => {
  const progress = getClearanceProgress(request || {});
  const templates = {
    FINANCE_APPROVED: {
      title: "Clearance Progress Updated",
      message: `Request ${requestId || "N/A"} | Employee: ${employeeName || "Employee"}. Finance Office has approved the clearance. Progress: ${progress} offices.`,
      actionText: "View Request",
      actionLink: "/hr-office/clearance-requests",
    },
    FINANCE_RETURNED: {
      title: "Clearance Request Returned",
      message: `Request ${requestId || "N/A"} | Employee: ${employeeName || "Employee"}. Finance Office returned the clearance request. Reason: ${reason || 'Review required.'}`,
      actionText: "View Request",
      actionLink: "/hr-office/clearance-requests",
    },
  };

  const template = templates[type];
  if (!template) {
    return [];
  }

  return createRoleNotification({
    role: "HR Officer",
    type,
    title: template.title,
    message: template.message,
    requestId: requestId || null,
    actionText: template.actionText,
    actionLink: template.actionLink,
  });
};

// 1. Get Clearance Requests (All, Pending, In Progress, Approved, Returned)
export const getFinanceRequests = async (req, res) => {
  try {
    const { status, search } = req.query;
    // Finance review starts after Department Head approval. Library review is a separate workflow step.
    const filter = { departmentStatus: 'Approved' };

    if (status && status !== "All") {
      filter.financeStatus = status;
    }

    let requests = await ClearanceRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const employeeIds = [...new Set(requests.map((r) => r.employeeId))];
    const employees = await Employee.find({
      employeeId: { $in: employeeIds },
    }).lean();

    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp.employeeId] = emp;
    });

    requests = requests.map((reqItem) => ({
      ...reqItem,
      employee: employeeMap[reqItem.employeeId] || null,
    }));

    for (const request of requests) {
      const createdAt = request.createdAt ? new Date(request.createdAt).getTime() : 0;
      const elapsedDays = createdAt ? Math.max(0, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24))) : 0;

      if (request.financeStatus === "Pending" && elapsedDays >= 5) {
        const existingReminder = await Notification.findOne({
          type: "PENDING_REMINDER",
          relatedRequestId: request.requestId || request._id?.toString?.() || null,
        });

        if (!existingReminder) {
          await notifyFinanceOfficers({
            type: "PENDING_REMINDER",
            employeeName: request.employeeName || request.employee?.fullName || "An employee",
            requestId: request.requestId || request._id?.toString?.() || "",
            daysPending: elapsedDays,
          });
        }
      }
    }

    if (search) {
      const keyword = search.toLowerCase();
      requests = requests.filter((r) => {
        const name = r.employee?.fullName?.toLowerCase() || "";
        const empId = r.employeeId?.toLowerCase() || "";
        const reqId = r.requestId?.toLowerCase() || "";
        return (
          name.includes(keyword) ||
          empId.includes(keyword) ||
          reqId.includes(keyword)
        );
      });
    }

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch finance clearance requests",
      error: error.message,
    });
  }
};

// 2. Get Single Request Details with Financial Records & Total Outstanding
export const getFinanceRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ClearanceRequest.findById(id).lean();

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Clearance request not found" });
    }
    if (request.departmentStatus !== 'Approved') {
      return res.status(404).json({ success: false, message: 'This request is waiting for the previous clearance office approval.' });
    }

    const employee = await Employee.findOne({
      employeeId: request.employeeId,
    }).lean();

    const financialRecords = await FinancialRecord.find({
      employeeId: request.employeeId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const outstandingRecords = financialRecords.filter(
      (rec) => rec.status === "Outstanding"
    );
    const totalOutstanding = outstandingRecords.reduce(
      (sum, rec) => sum + rec.amount,
      0
    );

    res.status(200).json({
      success: true,
      request: {
        ...request,
        employee,
        financialRecords,
        totalOutstanding,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch finance request details",
      error: error.message,
    });
  }
};

// 3. Start Review (Pending -> In Progress)
export const startFinanceReview = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ClearanceRequest.findById(id);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (request.departmentStatus !== 'Approved') {
      return res.status(400).json({ success: false, message: "This request is waiting for the previous clearance office approval." });
    }

    const currentFinanceStatus = String(request.financeStatus || "Pending").trim().toLowerCase();

    if (currentFinanceStatus === 'under review') {
      return res.status(200).json({
        success: true,
        message: "Request is already under review",
        request,
      });
    }

    if (!['pending', 'in progress'].includes(currentFinanceStatus)) {
      return res.status(400).json({
        success: false,
        message: `Only pending requests can be reviewed. Current status: ${request.financeStatus || 'Pending'}`,
      });
    }

    request.financeStatus = "Under Review";
    request.financeReviewedBy = req.user?.fullName || req.user?.name || req.body.reviewedBy || "Finance Officer";
    request.financeReviewedAt = new Date();

    await request.save();
    await notifyFinanceOfficers({
      type: "REQUEST_ASSIGNED",
      employeeName: request.employeeName || "An employee",
      requestId: request.requestId || request._id?.toString?.() || "",
    });

    res.status(200).json({
      success: true,
      message: "Review started successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Approve Clearance (Under Review -> Approved)
export const approveFinanceClearance = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ClearanceRequest.findById(id);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (request.departmentStatus !== 'Approved') {
      return res.status(400).json({ success: false, message: "This request is waiting for the previous clearance office approval." });
    }

    if (!['Under Review', 'In Progress'].includes(request.financeStatus)) {
      return res.status(400).json({
        success: false,
        message: "Only requests under review can be approved",
      });
    }

    const comment = String(req.body.comment || req.body.remarks || '').trim();
    request.financeStatus = "Approved";
    request.financeRemarks = comment;
    request.financeReviewedBy = req.user?.fullName || req.user?.name || req.body.reviewedBy || "Finance Officer";
    request.financeReviewedAt = new Date();
    updateFinanceWorkflow(request, 'Completed', comment);

    await request.save();
    const propertyOfficers = await User.find({ role: { $regex: '^property(?:\\s*\\/\\s*asset)?\\s+officer$', $options: 'i' } }).select('_id name');
    if (propertyOfficers.length) await Notification.insertMany(propertyOfficers.map((officer) => ({
      recipientId: officer._id,
      targetName: officer.name || 'Property Officer',
      title: 'Clearance Ready for Property Review',
      message: `${request.employeeName || 'An employee'}'s clearance was approved by Finance and is ready for Property / Asset review.`,
      type: 'CLEARANCE_READY_FOR_PROPERTY',
      actionText: 'Review Request',
      actionLink: '/property/clearance-requests',
      relatedRequestId: request.requestId,
      clearanceRequestId: request.requestId,
      isRead: false,
    })));
    await notifyHrOfficersOfFinanceDecision({
      type: "FINANCE_APPROVED",
      employeeName: request.employeeName || "This employee",
      requestId: request.requestId || request._id?.toString?.() || "",
      request,
    });
    await notifyEmployee({
      request,
      type: 'FINANCE_APPROVED',
      title: 'Finance Clearance Approved',
      message: 'Your clearance has been approved by Finance Office.',
    });
    await notifyFinanceOfficers({
      type: 'FINANCE_APPROVED',
      employeeName: request.employeeName,
      requestId: request.requestId || request._id?.toString?.() || '',
    });

    res.status(200).json({
      success: true,
      message: "Financial clearance approved successfully",
      request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Return Request (Pending/In Progress/Review -> Returned)
export const returnFinanceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const returnReason = String(req.body.returnReason || '').trim();
    const comment = String(req.body.comment || req.body.remarks || '').trim();

    if (!returnReason) {
      return res
        .status(400)
        .json({ success: false, message: "Return reason is required" });
    }

    const request = await ClearanceRequest.findById(id);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (request.departmentStatus !== 'Approved') {
      return res.status(400).json({ success: false, message: "This request is waiting for the previous clearance office approval." });
    }

    if (!['Pending', 'Under Review', 'In Progress'].includes(request.financeStatus)) {
      return res.status(400).json({
        success: false,
        message: "Only pending or under-review requests can be returned",
      });
    }

    request.financeStatus = "Returned";
    request.financeRemarks = comment;
    request.remarks = comment;
    request.returnReason = returnReason;
    request.financeReviewedBy = req.user?.fullName || req.user?.name || req.body.reviewedBy || "Finance Officer";
    request.financeReviewedAt = new Date();
    updateFinanceWorkflow(request, 'Returned', returnReason);
    const financeStep = request.workflow.find((step) => /finance/i.test(step.office || step.name || ''));
    if (financeStep) {
      financeStep.comment = comment;
      financeStep.remarks = comment;
      financeStep.returnReason = returnReason;
    }

    await request.save();
    await notifyHrOfficersOfFinanceDecision({
      type: "FINANCE_RETURNED",
      employeeName: request.employeeName || "This employee",
      requestId: request.requestId || request._id?.toString?.() || "",
      reason: returnReason,
      request,
    });
    await notifyEmployee({
      request,
      type: 'FINANCE_RETURNED',
      title: 'Finance Clearance Returned',
      message: `Your clearance request was returned by Finance Office. Reason: ${returnReason}. Please resolve the issue and resubmit.`,
    });
    await notifyFinanceOfficers({
      type: 'FINANCE_RETURNED',
      employeeName: request.employeeName,
      requestId: request.requestId || request._id?.toString?.() || '',
    });

    res.status(200).json({
      success: true,
      message: "Finance clearance request returned to employee",
      request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};