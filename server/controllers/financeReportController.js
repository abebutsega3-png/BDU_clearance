import ClearanceRequest from "../models/clearance.js";

const normalizeStatus = (value) => {
  const status = (value || "").toString().trim();
  if (!status) return "";
  if (status === "In Progress" || status === "Under Review") return "Under Review";
  return status;
};

const toStatusList = (status) => {
  if (!status) return [];
  if (status === "Under Review") return ["Under Review", "In Progress"];
  return [status];
};

const buildFilterQuery = (query = {}) => {
  const { startDate, endDate, campus, department, clearanceReason, status } = query;
  const filter = {};

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  if (campus) filter.campus = campus;
  if (department) filter.department = department;
  if (clearanceReason) filter.clearanceReason = clearanceReason;

  if (status) {
    const statuses = toStatusList(status);
    const statusOr = [
      { financeStatus: { $in: statuses } },
      { status: { $in: statuses } },
      { overallStatus: { $in: statuses } },
    ];
    filter.$or = statusOr;
  }

  return filter;
};

const getStatusValue = (request) => normalizeStatus(request.financeStatus || request.status || request.overallStatus);

export const getFinanceSummaryReport = async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);

    const requests = await ClearanceRequest.find(filter).lean();
    const summary = {
      total: requests.length,
      pending: 0,
      underReview: 0,
      approved: 0,
      returned: 0,
      rejected: 0,
      completed: 0,
    };

    requests.forEach((request) => {
      const status = getStatusValue(request);
      switch (status) {
        case "Pending":
          summary.pending += 1;
          break;
        case "Under Review":
          summary.underReview += 1;
          break;
        case "Approved":
          summary.approved += 1;
          break;
        case "Returned":
          summary.returned += 1;
          break;
        case "Rejected":
          summary.rejected += 1;
          break;
        case "Completed":
          summary.completed += 1;
          break;
        default:
          break;
      }
    });

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "የSummary ሪፖርት ማምጣት አልተቻለም",
      error: error.message,
    });
  }
};

export const getOutstandingObligationsReport = async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);
    const obligations = await ClearanceRequest.find({
      ...filter,
      $or: [
        { "financialObligation.balance": { $gt: 0 } },
        { "financialObligation.amountDue": { $gt: 0 } },
      ],
    })
      .select("employeeName employeeId department financialObligation financeStatus status overallStatus createdAt")
      .sort({ "financialObligation.balance": -1 });

    res.status(200).json({
      success: true,
      count: obligations.length,
      data: obligations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "የእዳ (Obligations) ሪፖርት ማምጣት አልተቻለም",
      error: error.message,
    });
  }
};

export const getPendingClearancesReport = async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);
    const pendingRequests = await ClearanceRequest.find({
      ...filter,
      $or: [
        { financeStatus: { $in: ["Pending", "Under Review", "In Progress"] } },
        { status: { $in: ["Pending", "Under Review", "In Progress"] } },
        { overallStatus: { $in: ["Pending", "Under Review", "In Progress"] } },
      ],
    })
      .select("requestId requestNumber employeeName employeeId department clearanceReason financeStatus status overallStatus createdAt")
      .sort({ createdAt: 1 });

    const now = new Date();
    const dataWithDays = pendingRequests.map((request) => {
      const created = new Date(request.createdAt || request.submittedDate || Date.now());
      const diffTime = Math.abs(now - created);
      const daysPending = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...request.toObject(),
        employeeName: request.employeeName || "Unknown Employee",
        financeStatus: getStatusValue(request) || request.financeStatus || request.status || "Pending",
        daysPending,
      };
    });

    res.status(200).json({
      success: true,
      count: dataWithDays.length,
      data: dataWithDays,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "የPending ሪፖርት ማምጣት አልተቻለም",
      error: error.message,
    });
  }
};

export const getFinanceHistoryReport = async (req, res) => {
  try {
    const filter = buildFilterQuery(req.query);
    const history = await ClearanceRequest.find({
      ...filter,
      $or: [
        { financeStatus: { $in: ["Approved", "Returned", "Rejected", "Completed"] } },
        { status: { $in: ["Approved", "Returned", "Rejected", "Completed"] } },
        { overallStatus: { $in: ["Approved", "Returned", "Rejected", "Completed"] } },
      ],
    })
      .select(
        "requestId requestNumber employeeName employeeId department clearanceReason financeStatus status overallStatus financialObligation financeReviewedByName financeReviewedAt financeReferenceNumber financeRemarks"
      )
      .sort({ financeReviewedAt: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "የHistory ሪፖርት ማምጣት አልተቻለም",
      error: error.message,
    });
  }
};