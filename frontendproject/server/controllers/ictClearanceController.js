import IctClearanceRequest from "../models/IctClearanceRequest.js";
import Clearance from "../models/clearance.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import ICTAsset from "../models/ICTAsset.js";
import mongoose from "mongoose";

const normalizeIctStatus = (status = "") => {
  const value = String(status || "").trim().toLowerCase();
  const statusMap = {
    pending: "Pending",
    "pending review": "Pending",
    "in progress": "Under Review",
    "under review": "Under Review",
    approved: "Approved",
    completed: "Completed",
    returned: "Returned",
    rejected: "Returned",
    cancelled: "Cancelled",
  };

  return statusMap[value] || "Pending";
};

const buildIctRequestFromClearance = (clearance = {}) => {
  const employee = clearance.employee && typeof clearance.employee === 'object' ? clearance.employee : {};
  const employeeName = employee.fullName || clearance.employeeName || "Unknown Employee";
  const employeeId = employee.employeeId || clearance.employeeId || "";
  const department = employee.department || clearance.department || "";
  const campus = employee.campus || clearance.campus || "Main Campus";
  const position = employee.position || clearance.position || "";
  const reason = clearance.clearanceReason || clearance.reason || "Clearance";
  const requestDate = clearance.requestDate || clearance.createdAt || new Date();
  const clearanceId = clearance.requestId || clearance.clearanceId || `CLR-${Date.now()}`;
  const ictStatus = normalizeIctStatus(clearance.ictStatus || "Pending");
  const workflow = Array.isArray(clearance.workflow) ? clearance.workflow : [];
  const clearanceProgress = workflow.map((step) => ({
    department: step.office || step.name || "Department",
    status: /ict/i.test(step.office || step.name || "") ? ictStatus : step.status || "Pending",
    updatedAt: step.updatedAt || step.timestamp || null,
  }));

  return {
    clearanceId,
    requestId: clearanceId,
    employee: {
      employeeId,
      fullName: employeeName,
      department,
      campus,
      email: employee.email || clearance.email || "",
      phone: employee.phone || clearance.phone || "",
      position,
      employmentType: employee.employmentType || clearance.employmentType || "",
    },
    clearanceReason: reason,
    clearanceType: clearance.clearanceType || reason,
    requestDate,
    lastWorkingDate: clearance.lastWorkingDate || clearance.expectedLastWorkingDate || clearance.relievingDate || "",
    overallStatus: clearance.overallStatus || clearance.status || "In Progress",
    employeeRequestDetails: {
      comment: clearance.additionalNote || clearance.employeeComment || clearance.remarks || clearance.reason || "",
      expectedClearanceDate: clearance.expectedClearanceDate || clearance.expectedLastWorkingDate || clearance.lastWorkingDate || clearance.relievingDate || "",
    },
    clearanceProgress,
    status: ictStatus,
    remarks: clearance.remarks || "",
    assetsIssued: Array.isArray(clearance.ictAssets) && clearance.ictAssets.length
      ? clearance.ictAssets.map((item) => {
        const asset = item && typeof item === 'object' ? item : { assetName: item };
        return {
          assetName: asset.assetName || asset.name || asset.assetType || "ICT Asset",
          assetId: asset.assetId || asset.assetTag || "",
          assetType: asset.assetType || asset.assetName || asset.name || "",
          serialNumber: asset.serialNumber || "",
          assetTag: asset.assetTag || asset.assetId || "",
          status: asset.status || (asset.isReturned ? "Returned" : "Assigned"),
          returnDate: asset.returnDate || null,
          isReturned: Boolean(asset.isReturned || asset.status === "Returned"),
        };
      })
      : Array.isArray(clearance.outstandingItems) ? clearance.outstandingItems.map((item) => {
      const asset = item && typeof item === 'object' ? item : { assetName: item };
      return {
        assetName: asset.assetName || asset.name || asset.assetType || "ICT Asset",
        assetId: asset.assetId || asset.assetTag || "",
        assetType: asset.assetType || asset.assetName || asset.name || "",
        serialNumber: asset.serialNumber || "",
        assetTag: asset.assetTag || asset.assetId || "",
        status: asset.status || "Assigned",
        returnDate: asset.returnDate || null,
        isReturned: Boolean(asset.isReturned || asset.status === "Returned"),
      };
    }) : [],
    accountDeactivation: {
      bduEmailDeactivated: false,
      portalAccessRevoked: false,
      wifiDomainAccessRevoked: false,
    },
    ictChecklist: clearance.ictChecklist || {},
  };
};

const createIctClearanceRequestFromClearance = async (clearance) => {
  try {
    if (!clearance) return null;

    const requestPayload = buildIctRequestFromClearance(clearance);
    const matchingId = requestPayload.clearanceId;

    const existing = await IctClearanceRequest.findOne({ clearanceId: matchingId }).lean();
    if (existing) {
      const nextStatus = normalizeIctStatus(clearance.ictStatus || existing.status);
      const updated = await IctClearanceRequest.findOneAndUpdate(
        { clearanceId: matchingId },
        {
          $set: {
            ...requestPayload,
            status: nextStatus,
            remarks: clearance.remarks || existing.remarks || "",
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after', runValidators: true }
      );
      return updated;
    }

    return IctClearanceRequest.create(requestPayload);
  } catch (error) {
    console.error('Error in createIctClearanceRequestFromClearance:', error.message);
    return null;
  }
};

// Notify ICT Officers of new clearance requests
const notifyIctOfficers = async (data) => {
	try {
    const ictOfficers = await User.find({ role: { $regex: '^(ict[ _]officer|ict)$', $options: 'i' } }).select('_id name');
		if (ictOfficers.length === 0) return;
		
    const isResubmitted = data.type === 'CLEARANCE_RESUBMITTED';
    const isCancelled = data.type === 'CANCELLED';
    const notificationType = data.type === 'NEW_CLEARANCE_REQUEST' || isResubmitted || isCancelled ? data.type : 'ACTION_REQUIRED';
    const notifications = ictOfficers.map((officer) => ({
			recipientId: officer._id,
      targetName: data.employeeName || 'Employee',
      employeeId: data.employeeId || '',
      title: data.type === 'NEW_CLEARANCE_REQUEST' ? 'New ICT Clearance Request' : isResubmitted ? 'Clearance Request Resubmitted' : isCancelled ? 'Clearance Request Cancelled' : 'Action Required',
      message: data.message || `${data.employeeName || 'An employee'} has a clearance request requiring ICT review.`,
      type: notificationType,
			relatedRequestId: data.requestId,
      clearanceRequestId: data.requestId,
			actionText: 'View Request',
      actionLink: '/ict-office/requests'
		}));
		
		await Notification.insertMany(notifications);
	} catch (error) {
		console.error('Unable to notify ICT Officers:', error.message);
	}
};

const notifyIctDecisionRecipients = async (request, status) => {
  if (!['Approved', 'Returned'].includes(status)) return;
  const employee = request.employee || {};
  const isApproved = status === 'Approved';
  const title = isApproved ? 'ICT Clearance Approved' : 'ICT Clearance Returned';
  const message = isApproved
    ? `${employee.fullName || 'Employee'}'s ICT clearance has been approved.`
    : `${employee.fullName || 'Employee'}'s ICT clearance has been returned for correction. Reason: ${request.remarks || 'Review required.'}`;
  const recipients = [];
  const employeeQueries = [];
  if (employee.employeeId) employeeQueries.push({ employeeId: employee.employeeId });
  if (employee.email) employeeQueries.push({ email: employee.email });
  if (employee.fullName) {
    const escapedName = String(employee.fullName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    employeeQueries.push({ name: { $regex: `^${escapedName}$`, $options: 'i' } });
  }
  const employeeUser = employeeQueries.length
    ? await User.findOne({ $or: employeeQueries }).select('_id')
    : null;
  if (employeeUser) recipients.push({ id: employeeUser._id, actionLink: '/employee/My%20Clearance', actionText: isApproved ? 'View Clearance' : 'View Request' });
  const hrUsers = await User.find({ role: { $regex: '^(hr[ _]officer|hr|human resources)$', $options: 'i' } }).select('_id');
  recipients.push(...hrUsers.map((user) => ({ id: user._id, actionLink: '/hr-office/clearance-requests', actionText: 'View Request' })));
  if (recipients.length) {
    await Notification.insertMany(recipients.map((recipient) => ({
      recipientId: recipient.id,
      targetName: employee.fullName || 'Employee',
      title,
      message,
      type: isApproved ? 'ICT_CLEARANCE_APPROVED' : 'ICT_CLEARANCE_RETURNED',
      relatedRequestId: request.clearanceId,
      clearanceRequestId: request.clearanceId,
      actionText: recipient.actionText,
      actionLink: recipient.actionLink,
      isRead: false,
    })));
  }
};

// 1. የክሊራንስ ጥያቄዎችን ማምጫ (ከነ Filtering: All, Pending, Approved, Returned)
const getIctClearanceRequests = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== "All") {
      const normalizedStatus = normalizeIctStatus(status);
      query.status = normalizedStatus === "Pending"
        ? { $in: ["Pending", "Pending Review"] }
        : normalizedStatus === "Approved"
          ? { $in: ["Approved", "Completed"] }
        : normalizedStatus;
    }

    if (search) {
      query.$or = [
        { "employee.fullName": { $regex: search, $options: "i" } },
        { "employee.employeeId": { $regex: search, $options: "i" } },
        { clearanceId: { $regex: search, $options: "i" } },
        { requestId: { $regex: search, $options: "i" } },
      ];
    }

    const requests = await IctClearanceRequest.find(query).sort({ createdAt: -1 }).lean();
    const clearanceIds = requests.map((request) => request.clearanceId).filter(Boolean);
    const sourceClearances = await Clearance.find({ requestId: { $in: clearanceIds } }).lean();
    const sourceById = new Map(sourceClearances.map((clearance) => [clearance.requestId, clearance]));
    const enrichedRequests = await Promise.all(requests.map(async (request) => {
      const source = sourceById.get(request.clearanceId);
      const sourceData = source
        ? buildIctRequestFromClearance({ ...source, ictStatus: request.status })
        : request;
      const employee = request.employee || sourceData.employee || {};
      const employeeAssetQuery = employee.employeeId
        ? {
          $or: [
            { 'currentAssignment.employeeId': employee.employeeId },
            { 'history.employeeId': employee.employeeId },
          ],
        }
        : employee.fullName
          ? {
            $or: [
              { 'currentAssignment.employeeName': employee.fullName },
              { 'history.employeeName': employee.fullName },
            ],
          }
          : null;
      const employeeAssets = employeeAssetQuery ? await ICTAsset.find(employeeAssetQuery).lean() : [];
      const databaseAssets = employeeAssets.map((asset) => ({
        assetName: `${asset.brand} ${asset.model}`.trim(),
        assetId: asset.assetId,
        assetType: asset.assetType,
        serialNumber: asset.serialNumber,
        assetTag: asset.assetId,
        status: asset.assetStatus === 'Returned' ? 'Returned' : 'Assigned',
        returnDate: null,
        isReturned: asset.assetStatus === 'Returned',
      }));
      const requestAssets = request.assetsIssued?.length ? request.assetsIssued : sourceData.assetsIssued || [];
      const knownAssetIds = new Set(requestAssets.map((asset) => asset.assetId || asset.assetTag).filter(Boolean));
      const assetsIssued = [
        ...requestAssets,
        ...databaseAssets.filter((asset) => !knownAssetIds.has(asset.assetId)),
      ];

      return {
        ...request,
        clearanceType: request.clearanceType || sourceData.clearanceType,
        lastWorkingDate: request.lastWorkingDate || sourceData.lastWorkingDate,
        overallStatus: sourceData.overallStatus,
        employee: request.employee?.email || request.employee?.phone ? request.employee : sourceData.employee,
        employeeRequestDetails: request.employeeRequestDetails?.comment || request.employeeRequestDetails?.expectedClearanceDate
          ? request.employeeRequestDetails
          : sourceData.employeeRequestDetails,
        clearanceProgress: sourceData.clearanceProgress,
        ictChecklist: request.ictChecklist || sourceData.ictChecklist,
        assetsIssued,
      };
    }));

    res.status(200).json({
      success: true,
      count: enrichedRequests.length,
      data: enrichedRequests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "የጥያቄዎችን ዝርዝር ማምጣት አልተቻለም",
      error: error.message,
    });
  }
};

// 2. የክሊራንስ ጥያቄ ውሳኔ መስጫ (Approve / Return with Remarks)
const processIctClearanceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, returnReason, assetsIssued, accountDeactivation, ictChecklist } = req.body;
    const finalStatus = normalizeIctStatus(status);

    if (finalStatus === "Returned" && (!remarks || remarks.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "ጥያቄውን ለመመለስ (Return) የችግሩን ምክንያት ማስታወሻ (Remark) ማስገባት ግዴታ ነው!",
      });
    }

    const request = await IctClearanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "የክሊራንስ ጥያቄው አልተገኘም" });
    }

    const reviewAssets = Array.isArray(assetsIssued)
      ? assetsIssued
      : Array.isArray(request.assetsIssued) ? request.assetsIssued : [];
    if (finalStatus === "Approved" && reviewAssets.some((asset) => !asset.isReturned && asset.status !== "Returned")) {
      return res.status(400).json({
        success: false,
        message: "ICT clearance cannot be approved while an ICT asset is outstanding.",
      });
    }

    const linkedIds = [request.clearanceId, request.requestId]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    const clearanceFilter = {
      $or: [
        ...linkedIds.map((linkedId) => ({ requestId: linkedId })),
        ...linkedIds
          .filter((linkedId) => mongoose.Types.ObjectId.isValid(linkedId))
          .map((linkedId) => ({ _id: linkedId })),
      ],
    };

    const clearance = await Clearance.findOne(clearanceFilter);
    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: "The linked employee clearance request could not be found",
      });
    }

    request.status = finalStatus;
    request.remarks = remarks || request.remarks || "";
    request.returnReason = returnReason || (finalStatus === "Returned" ? request.remarks : request.returnReason || "");
    if (Array.isArray(assetsIssued)) request.assetsIssued = assetsIssued;
    if (accountDeactivation) request.accountDeactivation = accountDeactivation;
    if (ictChecklist) request.ictChecklist = ictChecklist;
    request.processedBy = {
      officerId: req.user?._id || null,
      officerName: req.user?.fullName || req.user?.name || "ICT Officer",
      processedAt: new Date(),
    };

    await request.save();

    const workflowStep = {
      office: 'ICT Office',
      action: `ICT Clearance ${finalStatus}`,
      performedBy: request.processedBy.officerName,
      timestamp: request.processedBy.processedAt,
      updatedAt: request.processedBy.processedAt,
      status: finalStatus,
      remarks: request.remarks,
      returnReason: request.returnReason,
    };
    const existingIctStep = Array.isArray(clearance.workflow)
      ? clearance.workflow.findIndex((step) => /ict/i.test(step.office || step.name || ''))
      : -1;
    const workflowUpdate = existingIctStep >= 0
      ? { [`workflow.${existingIctStep}`]: { ...clearance.workflow[existingIctStep], ...workflowStep } }
      : { $push: { workflow: workflowStep } };

    await Clearance.findOneAndUpdate(
      { _id: clearance._id },
      {
        $set: {
          ictStatus: finalStatus,
          ictRemarks: request.remarks,
          ictReturnReason: request.returnReason,
          ictReviewedBy: request.processedBy.officerName,
          ictReviewedAt: request.processedBy.processedAt,
          ictAssets: request.assetsIssued,
          ictChecklist: request.ictChecklist,
          ictClearance: {
            status: finalStatus,
            reviewedBy: request.processedBy.officerName,
            reviewedAt: request.processedBy.processedAt,
            comment: request.remarks,
            returnReason: request.returnReason,
            assets: request.assetsIssued,
          },
          updatedAt: new Date(),
        },
        ...workflowUpdate,
      },
      { returnDocument: 'after' }
    );

    try {
      await notifyIctDecisionRecipients(request, finalStatus);
    } catch (notificationError) {
      console.error('ICT decision saved, but recipient notification failed:', notificationError.message);
    }

    res.status(200).json({
      success: true,
      message: `የክሊራንስ ጥያቄው በጥሩ ሁኔታ ${finalStatus === "Approved" ? "ጽድቋል" : "ተመልሷል"}`,
      data: request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ውሳኔውን ማስቀመጥ አልተቻለም",
      error: error.message,
    });
  }
};

export {
  getIctClearanceRequests,
  processIctClearanceRequest,
  notifyIctOfficers,
  normalizeIctStatus,
  buildIctRequestFromClearance,
  createIctClearanceRequestFromClearance,
};