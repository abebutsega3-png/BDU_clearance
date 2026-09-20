import Clearance from '../models/clearance.js';
import Employee from '../models/employee.js';
import ClearanceRequest from '../models/ClearanceRequest.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { notifyFinanceOfficers } from './financeclearancerequestController.js';

const CORE_OFFICES = ['Department Head', 'Finance Office', 'Property / Asset Office', 'ICT Office', 'Library'];
const approvedStatuses = ['approved', 'completed', 'cleared'];

const employeeFilter = (employeeId) => ({
  $or: [
    { employeeId },
    ...(mongoose.Types.ObjectId.isValid(employeeId) ? [{ _id: employeeId }] : []),
  ],
});

const officeAliases = {
  'department head': 'Department Head',
  department: 'Department Head',
  finance: 'Finance Office',
  'finance office': 'Finance Office',
  property: 'Property / Asset Office',
  'property office': 'Property / Asset Office',
  'property management': 'Property / Asset Office',
  'property / asset office': 'Property / Asset Office',
  ict: 'ICT Office',
  'ict center': 'ICT Office',
  'ict office': 'ICT Office',
  library: 'Library',
  'library office': 'Library',
};

const normalizeOfficeName = (value) => {
  const name = String(value || '').trim().toLowerCase();
  const compactName = name.replace(/[^a-z0-9]+/g, '');
  if (officeAliases[name]) return officeAliases[name];
  if (compactName.includes('department')) return 'Department Head';
  if (compactName.includes('finance')) return 'Finance Office';
  if (compactName.includes('property') || compactName.includes('asset')) return 'Property / Asset Office';
  if (compactName.includes('ict')) return 'ICT Office';
  if (compactName.includes('library')) return 'Library';
  return value;
};

const normalizeOfficeStatus = (value) => String(value || '').trim().toLowerCase();

const findEmployeeUser = async (clearance) => {
  if (clearance.employeeId) {
    const byEmployeeId = await User.findOne({ employeeId: clearance.employeeId }).select('_id name employeeId').lean();
    if (byEmployeeId) return byEmployeeId;
  }

  return User.findOne({
    name: clearance.employeeName,
    role: { $regex: /^(employee|standard user|user)$/i },
  }).select('_id name employeeId').lean();
};

const getOfficeProgress = (clearance) => {
  const workflow = [
    ...(Array.isArray(clearance.workflow) ? clearance.workflow : []),
    ...(Array.isArray(clearance.departmentClearances) ? clearance.departmentClearances : []),
  ];
  const statusFields = {
    'Finance Office': clearance.financeStatus,
    'ICT Office': clearance.ictStatus,
    'Property / Asset Office': clearance.propertyStatus,
    'Department Head': clearance.departmentStatus,
    Library: clearance.libraryStatus,
  };
  return CORE_OFFICES.map((office) => {
    const matches = workflow.filter((step) => normalizeOfficeName(step.office || step.name || step.department) === office);
    const approvedStep = [...matches].reverse().find((candidate) => approvedStatuses.includes(normalizeOfficeStatus(candidate.status)));
    const step = approvedStep
      || [...matches].reverse().find((candidate) => !['pending', ''].includes(normalizeOfficeStatus(candidate.status)))
      || matches[matches.length - 1]
      || {};
    const workflowStatus = String(step.status || '').trim();
    const fieldStatus = String(statusFields[office] || '').trim();
    const status = approvedStatuses.includes(normalizeOfficeStatus(fieldStatus))
      ? fieldStatus
      : fieldStatus && !['pending', ''].includes(fieldStatus.toLowerCase())
      ? fieldStatus
      : workflowStatus || fieldStatus || 'Pending';
    const officeReviewer = office === 'Property / Asset Office' ? clearance.propertyReviewedBy : '';
    const officeDate = office === 'Property / Asset Office' ? clearance.propertyReviewedAt : null;
    const officeRemarks = office === 'Property / Asset Office' ? clearance.officerComment : '';
    return {
      office,
      status,
      clearedBy: step.clearedBy || step.approvedBy || step.reviewedBy || officeReviewer || '-',
      clearedDate: step.clearedDate || step.completedAt || step.updatedAt || officeDate || '-',
      remarks: step.remarks || step.comment || step.returnReason || officeRemarks || '',
    };
  });
};

const getOfficeCounts = (clearance) => {
  const offices = getOfficeProgress(clearance);
  const approvedCount = offices.filter((office) => approvedStatuses.includes(String(office.status).toLowerCase())).length;
  return { offices, approvedCount, totalOffices: CORE_OFFICES.length };
};

// GET HR Final Clearance Details
export const getHRFinalClearanceDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Find clearance by ID or request ID
    let clearance = await Clearance.findOne({
      $or: [
        { requestId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }
      ]
    }).lean();

    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance request not found'
      });
    }

    // Get employee details
    let employeeData = null;
    if (clearance.employeeId) {
      employeeData = await Employee.findOne(employeeFilter(clearance.employeeId)).select('-password -createdBy').lean();
    }

    // Get clearance request details
    let clearanceRequest = null;
    if (clearance.requestId) {
      clearanceRequest = await ClearanceRequest.findOne({
        requestId: clearance.requestId
      }).lean();
    }

    // Calculate progress
    const { offices: departmentClearances, approvedCount, totalOffices: totalDepartments } = getOfficeCounts(clearance);
    const progress = Math.round((approvedCount / totalDepartments) * 100);

    // Outstanding items
    const outstandingItems = Array.isArray(clearance.outstandingItems)
      ? clearance.outstandingItems
      : [];

    // Build comprehensive response
    const response = {
      success: true,
      clearance: {
        _id: clearance._id,
        requestId: clearance.requestId,
        status: clearance.status,
        
        // Employee Information
        employeeId: clearance.employeeId,
        employeeName: employeeData?.fullName || clearance.employeeName || 'Unknown employee',
        employee: employeeData ? {
          fullName: employeeData.fullName,
          employeeId: employeeData.employeeId,
          department: employeeData.department,
          position: employeeData.position,
          campus: employeeData.campus,
          employmentType: employeeData.employmentType,
          supervisor: employeeData.supervisor || '-',
          hireDate: employeeData.hireDate,
          lastWorkingDate: clearance.lastWorkingDate,
          email: employeeData.email,
          phone: employeeData.phone
        } : {
          fullName: clearance.employeeName || 'Unknown employee',
          employeeId: clearance.employeeId || '-',
          department: clearance.department?.name || 'Not assigned',
          position: 'Not assigned',
          campus: 'Not assigned',
          employmentType: 'Not assigned',
          supervisor: '-',
          hireDate: '-',
          lastWorkingDate: clearance.lastWorkingDate,
          email: '-',
          phone: '-'
        },

        // Clearance Request Information
        clearanceType: clearance.clearanceType || clearanceRequest?.clearanceReason || 'Resignation',
        reason: clearance.reason || clearanceRequest?.clearanceReason || 'Personal reason',
        requestDate: clearance.requestDate || clearanceRequest?.requestDate || new Date().toISOString(),
        submissionDate: clearanceRequest?.submittedDate || clearance.requestDate,
        lastWorkingDate: clearance.lastWorkingDate,
        expectedLastWorkingDate: clearanceRequest?.expectedLastWorkingDate,

        // Department Clearances
        departmentClearances: departmentClearances.map(d => ({
          name: d.office,
          status: d.status || 'Pending',
          clearedBy: d.clearedBy || d.by || '-',
          clearedDate: d.clearedDate || d.date || '-',
          remarks: d.remarks || 'No remarks'
        })),

        // Outstanding Items
        outstandingItems: outstandingItems,

        // Progress
        progress: progress,
        completedDepartments: approvedCount,
        totalDepartments: totalDepartments,
        progressLabel: progress >= 100 ? 'Completed' : progress >= 60 ? 'In progress' : 'Pending',

        // HR Remarks
        hrRemarks: clearance.hrRemarks || '',

        // Checklist
        checklistCompleted: clearance.checklistCompleted || false,
        finalHRApproval: clearance.finalHRApproval === true || clearance.status === 'Completed',

        // Clearance History
        history: clearance.workflow || [],

        // Timestamps
        createdAt: clearance.createdAt,
        updatedAt: clearance.updatedAt
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching HR final clearance:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch clearance details',
      error: error.message
    });
  }
};

// UPDATE HR Final Decision
export const updateHRFinalDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision: requestedDecision, status, action, remarks, checklistCompleted } = req.body;
    const rawDecision = requestedDecision || status || action;

    // Validate decision
    const validDecisions = ['Pending', 'In Progress', 'Approved', 'Completed', 'Returned', 'Rejected'];
    const decisionAliases = {
      pending: 'Pending',
      'in progress': 'In Progress',
      approve: 'Approved',
      approved: 'Approved',
      'approve request': 'Approved',
      complete: 'Completed',
      completed: 'Completed',
      return: 'Returned',
      returned: 'Returned',
      'return request': 'Returned',
      reject: 'Rejected',
      rejected: 'Rejected',
    };
    const decision = decisionAliases[String(rawDecision || '').trim().toLowerCase()];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision status'
      });
    }

    const clearanceFilter = {
      $or: [
        { requestId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }
      ]
    };
    const currentClearance = await Clearance.findOne(clearanceFilter).lean();
    if (!currentClearance) {
      return res.status(404).json({ success: false, message: 'Clearance request not found' });
    }
    const currentCounts = getOfficeCounts(currentClearance);
    if (currentCounts.approvedCount < 1) {
      return res.status(400).json({ success: false, message: 'Final HR review becomes available after at least one office is approved.' });
    }
    if (decision === 'Completed' && currentCounts.approvedCount !== currentCounts.totalOffices) {
      return res.status(400).json({ success: false, message: `Final HR approval requires all ${currentCounts.totalOffices} offices to be approved. Current progress: ${currentCounts.approvedCount}/${currentCounts.totalOffices}.` });
    }

    // Find and update clearance
    const clearance = await Clearance.findOneAndUpdate(
      clearanceFilter,
      {
        $set: {
          status: decision,
            overallStatus: decision,
            returnReason: decision === 'Returned' || decision === 'Rejected' ? (remarks || '') : '',
            officerComment: remarks || '',
            reviewedAt: new Date(),
          finalHRApproval: decision === 'Completed',
          hrRemarks: remarks || '',
          checklistCompleted: Boolean(checklistCompleted),
          updatedAt: new Date()
        },
        $push: {
          workflow: {
            action: `HR Final Clearance ${decision}`,
            performedBy: 'HR Officer',
            timestamp: new Date(),
            status: decision,
            remarks: remarks
          }
        }
      },
      { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance request not found'
      });
    }

    // Keep the employee-facing request in sync with the HR decision.
    if (decision === 'Completed' || decision === 'Approved' || decision === 'In Progress' || decision === 'Returned' || decision === 'Rejected') {
      await ClearanceRequest.updateOne(
        { requestId: clearance.requestId },
        {
          $set: {
            status: decision,
            overallStatus: decision,
            updatedAt: new Date()
          }
        }
      );

      const employeeUser = await findEmployeeUser(clearance);

      const employeeMessage = decision === 'Approved' || decision === 'In Progress'
        ? 'Your clearance request has been approved and sent to the required offices.'
        : decision === 'Returned' || decision === 'Rejected'
          ? `Your clearance request was returned by the HR Office. Reason: ${remarks || 'Please review and correct the request.'}`
          : 'All required offices have completed your clearance. Your request is now under final HR processing.';

      await Notification.create({
        recipientId: employeeUser?._id || null,
        employeeId: clearance.employeeId || employeeUser?.employeeId || '',
        targetName: clearance.employeeName || 'Employee',
        title: decision === 'Approved' || decision === 'In Progress' ? 'Clearance Request Approved' : decision === 'Returned' || decision === 'Rejected' ? 'Clearance Request Returned' : 'All Clearances Completed',
        message: employeeMessage,
        type: decision === 'Approved' || decision === 'In Progress' ? 'CLEARANCE_UPDATED' : decision === 'Returned' || decision === 'Rejected' ? 'CLEARANCE_REQUEST_RETURNED' : 'ALL_CLEARANCES_COMPLETED',
        actionText: decision === 'Returned' || decision === 'Rejected' ? 'View Request & Resubmit' : 'View Clearance',
        actionLink: '/employee/My%20Clearance',
        relatedRequestId: clearance.requestId || null,
        clearanceRequestId: clearance.requestId || null,
        isRead: false,
      });

      if (decision === 'Completed' && currentCounts.approvedCount === currentCounts.totalOffices) {
        const hrOfficers = await User.find({ role: { $regex: '^hr officer$', $options: 'i' } }).select('_id name');
        await Notification.insertMany(hrOfficers.map((officer) => ({
          recipientId: officer._id,
          targetName: officer.name || 'HR Officer',
          title: 'Certificate Ready',
          message: `${clearance.employeeName || 'Employee'}'s clearance has been fully completed and approved. The certificate is ready to generate.`,
          type: 'certificate_available',
          actionText: 'Generate Certificate',
          actionLink: '/hr-office/final-hr-clearance',
          relatedRequestId: clearance.requestId || null,
          clearanceRequestId: clearance.requestId || null,
          isRead: false,
        })));
        await notifyFinanceOfficers({
          type: 'CLEARANCE_COMPLETED',
          employeeName: clearance.employeeName,
          requestId: clearance.requestId,
        });
        await notifyFinanceOfficers({
          type: 'FINAL_HR_CLEARANCE_COMPLETED',
          employeeName: clearance.employeeName,
          requestId: clearance.requestId,
        });
      }
    }

    res.json({
      success: true,
      message: `Clearance ${decision.toLowerCase()} successfully`,
      clearance
    });
  } catch (error) {
    console.error('Error updating HR final decision:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to save final clearance',
      error: error.message
    });
  }
};

// GET All Clearance Requests for HR Review
export const getAllClearanceRequestsForHR = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) {
      query.status = status;
    }

    const clearances = await Clearance.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Clearance.countDocuments(query);

    const getOverallStatus = (clearance) => {
      const { approvedCount, totalOffices } = getOfficeCounts(clearance);

      if (clearance.status === 'Completed' && clearance.finalHRApproval === true) {
        return 'CERTIFICATE ISSUED';
      }

      if (approvedCount === totalOffices) {
        return 'READY FOR CERTIFICATE';
      }

      if (approvedCount > 0 || ['In Progress', 'Returned', 'Under Review'].includes(String(clearance.status || ''))) {
        return 'IN PROGRESS';
      }

      return 'PENDING';
    };

    const enrichedClearances = await Promise.all(
      clearances.map(async (clearance) => {
        let employee = null;
        if (clearance.employeeId) {
          employee = await Employee.findOne(employeeFilter(clearance.employeeId)).select('fullName employeeId department position').lean();
        }

        const { offices: departmentClearances, approvedCount, totalOffices: totalDepts } = getOfficeCounts(clearance);
        const overallStatus = getOverallStatus(clearance);

        return {
          _id: clearance._id,
          requestId: clearance.requestId,
          employeeId: clearance.employeeId,
          employeeName: employee?.fullName || clearance.employeeName,
          department: employee?.department || clearance.department?.name,
          position: employee?.position,
          clearanceType: clearance.clearanceType,
          status: clearance.status,
          overallStatus,
          departmentClearances,
          completedDepartments: approvedCount,
          totalDepartments: totalDepts,
          officeProgress: `${approvedCount}/${totalDepts}`,
          progress: Math.round((approvedCount / totalDepts) * 100),
          requestDate: clearance.requestDate,
          createdAt: clearance.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: enrichedClearances,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching clearances for HR:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch clearances',
      error: error.message
    });
  }
};

// Generate Certificate
export const generateCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    const clearance = await Clearance.findOne({
      $or: [
        { requestId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }
      ]
    }).lean();

    if (!clearance) {
      return res.status(404).json({
        success: false,
        message: 'Clearance request not found'
      });
    }

    const { approvedCount, totalOffices } = getOfficeCounts(clearance);
    if (approvedCount !== totalOffices || clearance.finalHRApproval !== true || clearance.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: `Certificate requires ${totalOffices}/${totalOffices} offices approved and final HR approval.`
      });
    }

    if (clearance.certificate?.number) {
      return res.json({ success: true, certificate: clearance.certificate, alreadyExists: true });
    }

    // Keep the certificate on the clearance so it appears in the list after refresh.
    const certificateNumber = `BDU/CLR/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`;

    const certificate = {
      number: certificateNumber,
      generatedAt: new Date(),
      generatedBy: 'HR Officer',
      employeeId: clearance.employeeId,
      employeeName: clearance.employeeName,
      requestId: clearance.requestId,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };

    const hrOfficers = await User.find({ role: { $regex: '^hr officer$', $options: 'i' } }).select('_id name');
    await Notification.insertMany(hrOfficers.map((officer) => ({
      recipientId: officer._id,
      targetName: officer.name || 'HR Officer',
      title: 'Certificate Generated Successfully',
      message: `Certificate No: ${certificate.number} has been generated.`,
      type: 'certificate_available',
      actionText: 'View Certificate',
      actionLink: '/hr-office/certificates',
      relatedRequestId: clearance.requestId || null,
      clearanceRequestId: clearance.requestId || null,
      isRead: false,
    })));

    await Clearance.updateOne(
      { _id: clearance._id },
      { $set: { certificate, updatedAt: new Date() } },
    );

    res.json({
      success: true,
      certificate
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to generate certificate',
      error: error.message
    });
  }
};

// GET generated certificates for the HR certificate list
export const getGeneratedCertificates = async (req, res) => {
  try {
    const clearances = await Clearance.find({ 'certificate.number': { $exists: true } })
      .sort({ 'certificate.generatedAt': -1 })
      .lean();

    const certificates = clearances.map((clearance) => ({
      _id: clearance._id,
      certificateNo: clearance.certificate.number,
      employee: clearance.employeeName || clearance.certificate.employeeName || '—',
      employeeId: clearance.employeeId || clearance.certificate.employeeId || '—',
      department: typeof clearance.department === 'string' ? clearance.department : clearance.department?.name || '—',
      generatedDate: clearance.certificate.generatedAt,
      generatedBy: clearance.certificate.generatedBy || 'HR Officer',
      status: clearance.certificate.issuedAt ? 'Issued' : 'Generated',
      issuedAt: clearance.certificate.issuedAt || null,
      certificate: clearance.certificate,
      finalHRApproval: clearance.finalHRApproval === true && clearance.status === 'Completed',
      clearanceId: clearance.requestId || clearance._id,
      clearanceSummary: clearance.departmentClearances || [],
    }));

    res.json({ success: true, data: certificates });
  } catch (error) {
    console.error('Error fetching generated certificates:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch certificates', error: error.message });
  }
};

// Mark a persisted certificate as issued to the employee
export const issueCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const existingClearance = await Clearance.findOne({
      $or: [{ requestId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }],
      'certificate.number': { $exists: true },
    }).lean();

    if (!existingClearance) return res.status(404).json({ success: false, message: 'Certificate not found' });

    if (existingClearance.certificate.issuedAt) {
      return res.json({ success: true, certificate: existingClearance.certificate, alreadyIssued: true });
    }

    const clearance = await Clearance.findOneAndUpdate(
      { _id: existingClearance._id, 'certificate.issuedAt': { $exists: false } },
      { $set: { 'certificate.issuedAt': new Date(), updatedAt: new Date() } },
      { returnDocument: 'after' },
    ).lean();

    if (!clearance) {
      return res.json({ success: true, certificate: existingClearance.certificate, alreadyIssued: true });
    }

    const employeeUser = await findEmployeeUser(clearance);

    await Notification.create({
      recipientId: employeeUser?._id || null,
      employeeId: clearance.employeeId || employeeUser?.employeeId || '',
      targetName: clearance.employeeName || 'Employee',
      title: 'Your Clearance Certificate Is Ready',
      message: `Your Employee Clearance Certificate has been issued. Certificate No: ${clearance.certificate.number}`,
      type: 'CERTIFICATE_ISSUED',
      actionText: 'View Certificate',
      actionLink: '/employee/documents',
      relatedRequestId: clearance.requestId || null,
      clearanceRequestId: clearance.requestId || null,
      isRead: false,
    });

    await notifyFinanceOfficers({
      type: 'CERTIFICATE_ISSUED',
      employeeName: clearance.employeeName,
      requestId: clearance.requestId,
    });

    const hrOfficers = await User.find({ role: { $regex: '^hr officer$', $options: 'i' } }).select('_id name');
    await Notification.insertMany(hrOfficers.map((officer) => ({
      recipientId: officer._id,
      targetName: officer.name || 'HR Officer',
      title: 'Certificate Issued Successfully',
      message: `${clearance.employeeName || 'Employee'}'s clearance certificate has been issued.`,
      type: 'CERTIFICATE_ISSUED',
      actionText: 'View Certificate',
      actionLink: '/hr-office/certificates',
      relatedRequestId: clearance.requestId || null,
      clearanceRequestId: clearance.requestId || null,
      isRead: false,
    })));

    res.json({ success: true, certificate: clearance.certificate });
  } catch (error) {
    console.error('Error issuing certificate:', error);
    res.status(500).json({ success: false, message: 'Unable to issue certificate', error: error.message });
  }
};

// GET certificates issued to one employee
export const getEmployeeCertificates = async (req, res) => {
  try {
    const { employeeId } = req.params;
    let resolvedEmployeeId = employeeId;
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      const employeeUser = await User.findById(employeeId).select('employeeId').lean();
      resolvedEmployeeId = employeeUser?.employeeId || employeeId;
    }
    const clearances = await Clearance.find({
      $or: [{ employeeId: resolvedEmployeeId }, { 'certificate.employeeId': resolvedEmployeeId }],
      'certificate.number': { $exists: true },
      'certificate.issuedAt': { $exists: true },
    }).sort({ 'certificate.generatedAt': -1 }).lean();

    const certificates = clearances.map((clearance) => ({
      certificateNo: clearance.certificate.number,
      clearanceType: clearance.clearanceType || 'Resignation Clearance',
      completedDate: clearance.certificate.issuedAt || clearance.certificate.generatedAt,
      status: 'Issued',
      hrManagerName: clearance.certificate.generatedBy || 'HR Officer',
      position: clearance.employee?.position || clearance.position || '—',
      clearanceId: clearance.requestId || clearance._id,
      employeeId: clearance.employeeId,
      employeeName: clearance.employeeName,
      department: typeof clearance.department === 'string' ? clearance.department : clearance.department?.name || '—',
      departmentClearances: clearance.departmentClearances || [],
    }));

    res.json({ success: true, data: certificates });
  } catch (error) {
    console.error('Error fetching employee certificates:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch employee certificates', error: error.message });
  }
};
