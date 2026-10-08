import LibraryClearance from '../models/LibraryClearance.js';
import Clearance from '../models/clearance.js';
import Employee from '../models/employee.js';

const normalizeStatus = (clearance) => {
  if (clearance.status === 'Approved' || clearance.status === 'Completed') return 'Returned';
  if (clearance.status === 'Returned') return 'Overdue';
  if (clearance.borrowedItemsStatus === 'Not Clear' || Number(clearance.outstandingFineAmount || 0) > 0) return 'Outstanding';
  return 'Borrowed';
};

const matchesSearch = (record, search) => {
  if (!search) return true;
  const materialDetails = (record.materials || [])
    .map((material) => `${material.title || ''} ${material.materialId || ''}`)
    .join(' ');
  const value = `${record.employeeName} ${record.employeeId} ${record.requestId} ${record.department} ${materialDetails}`.toLowerCase();
  return value.includes(search.toLowerCase());
};

export const getLibraryDashboard = async (_req, res) => {
  try {
    const libraryRequestFilter = {
      $or: [
        { requiredOffices: { $regex: 'library', $options: 'i' } },
        { libraryStatus: { $exists: true } },
      ],
    };
    const [requests, libraryRecords] = await Promise.all([
      Clearance.find(libraryRequestFilter)
        .select('requestId employeeId employeeName employee department createdAt requestDate libraryStatus libraryVerificationResult libraryReviewedAt libraryComment libraryReturnReason')
        .sort({ createdAt: -1 })
        .maxTimeMS(15000)
        .lean(),
      LibraryClearance.find({})
        .select('employeeId materials outstandingFineAmount borrowedItemsStatus')
        .maxTimeMS(15000)
        .lean(),
    ]);

    const getRequestStatus = (request) => {
      const status = request.libraryStatus || 'Pending';
      if (status === 'In Progress' || status === 'Under Review') return 'Under Review';
      if (status === 'Completed' || status === 'Approved') return 'Approved';
      if (status === 'Rejected' || status === 'Returned') return 'Returned';
      return 'Pending';
    };
    const statusCounts = { pending: 0, underReview: 0, approved: 0, returned: 0 };
    const monthlyRequests = Array(12).fill(0);
    const uniqueClearedEmployees = new Set();
    const requestRows = requests.map((request) => {
      const status = getRequestStatus(request);
      statusCounts[status === 'Under Review' ? 'underReview' : status.toLowerCase()] += 1;
      const createdDate = request.createdAt ? new Date(request.createdAt) : null;
      if (createdDate && !Number.isNaN(createdDate.getTime()) && createdDate.getFullYear() === new Date().getFullYear()) {
        monthlyRequests[createdDate.getMonth()] += 1;
      }
      if (status === 'Approved' && request.employeeId) uniqueClearedEmployees.add(request.employeeId);
      return {
        _id: request._id,
        requestId: request.requestId,
        employeeId: request.employeeId,
        employeeName: request.employeeName || request.employee?.fullName || request.employeeId || 'Unknown employee',
        department: request.department?.name || request.department || '',
        createdAt: request.createdAt || request.requestDate || null,
        status,
      };
    });

    let booksNotReturned = 0;
    let overdueBooks = 0;
    let unpaidFines = 0;
    for (const record of libraryRecords) {
      const materials = Array.isArray(record.materials) ? record.materials : [];
      const materialFineBalance = materials.reduce(
        (sum, material) => sum + Math.max(0, Number(material.fineAmount || 0) - Number(material.finePaidAmount || 0)),
        0,
      );
      const legacyFineBalance = Math.max(0, Number(record.outstandingFineAmount || 0) - materialFineBalance);
      unpaidFines += materialFineBalance + legacyFineBalance;

      let activeMaterials = 0;
      for (const material of materials) {
        const status = String(material.status || '').toLowerCase();
        const active = ['borrowed', 'outstanding', 'overdue', 'lost'].includes(status);
        if (!active) continue;
        activeMaterials += 1;
        if (status === 'overdue' || (material.dueDate && new Date(material.dueDate) < new Date())) overdueBooks += 1;
      }
      booksNotReturned += activeMaterials;
      if (!activeMaterials && record.borrowedItemsStatus === 'Not Clear') booksNotReturned += 1;
    }

    return res.status(200).json({
      success: true,
      stats: {
        total: requests.length,
        ...statusCounts,
        booksNotReturned,
        overdueBooks,
        unpaidFines,
        clearedEmployees: uniqueClearedEmployees.size,
      },
      statusOverview: {
        pending: statusCounts.pending,
        underReview: statusCounts.underReview,
        approved: statusCounts.approved,
        returned: statusCounts.returned,
      },
      monthlyRequests,
      recentRequests: requestRows.slice(0, 5),
    });
  } catch (error) {
    console.error('Library dashboard data error:', error);
    const timedOut = error.code === 50 || (error.name === 'MongooseError' && /timed out/i.test(error.message));
    return res.status(timedOut ? 503 : 500).json({
      success: false,
      message: timedOut ? 'Library dashboard data query timed out.' : 'Unable to load library dashboard data.',
    });
  }
};

export const getLibraryRecords = async (req, res) => {
  try {
    const { search = '', department = 'All', campus = 'All', status = 'All', employeeId = '' } = req.query;
    const query = {};
    if (department !== 'All') query.department = department;
    if (employeeId) query.employeeId = employeeId;

    const records = await LibraryClearance.find(query).sort({ submittedDate: -1, createdAt: -1 }).lean();
    const employeeIds = [...new Set(records.map((record) => record.employeeId).filter(Boolean))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds } })
      .select('employeeId fullName firstName middleName lastName gender nationality maritalStatus dateOfBirth department position campus employmentType hireDate employmentDate educationLevel roomNumber phone email alternativePhone address emergencyContact emergencyPhone photo')
      .lean();
    const employeeById = new Map(employees.map((employee) => [employee.employeeId, employee]));
    const enriched = records.map((record) => {
      const materials = record.materials || [];
      const materialFineBalance = materials.reduce(
        (total, material) => total + Math.max(0, Number(material.fineAmount || 0) - Number(material.finePaidAmount || 0)),
        0,
      );
      const legacyFineBalance = Math.max(0, Number(record.outstandingFineAmount || 0) - materialFineBalance);
      return {
        ...record,
        employeeProfile: employeeById.get(record.employeeId) || null,
        materials: materials.map((material, index) => ({
          ...material,
          isbn: material.isbn || material.materialId || '',
          publicationYear: material.publicationYear || null,
          condition: material.condition || '',
          fineAmount: Number(material.fineAmount || 0),
          finePaidAmount: Number(material.finePaidAmount || 0),
          fineBalance: Math.max(0, Number(material.fineAmount || 0) - Number(material.finePaidAmount || 0))
            + (index === 0 ? legacyFineBalance : 0),
        })),
        legacyFineBalance,
        recordStatus: normalizeStatus(record),
        dueDate: record.dueDate || null,
        campus: record.campus || 'N/A',
      };
    }).filter((record) => (
      (campus === 'All' || record.campus === campus)
      && (status === 'All' || record.recordStatus === status)
      && matchesSearch(record, search)
    ));

    res.status(200).json({
      success: true,
      records: enriched,
      summary: {
        borrowed: enriched.filter((record) => record.recordStatus === 'Borrowed').length,
        outstanding: enriched.filter((record) => record.recordStatus === 'Outstanding').length,
        overdue: enriched.filter((record) => record.recordStatus === 'Overdue').length,
        returned: enriched.filter((record) => record.recordStatus === 'Returned').length,
      },
      departments: [...new Set(records.map((record) => record.department).filter(Boolean))],
      campuses: [...new Set(records.map((record) => record.campus).filter(Boolean))],
    });
  } catch (error) {
    console.error('Library records error:', error);
    res.status(500).json({ success: false, message: 'Failed to load library records' });
  }
};

export const issueLibraryMaterial = async (req, res) => {
  try {
    const {
      employeeId,
      materialType,
      title,
      materialId,
      publicationYear,
      condition,
      borrowDate,
      dueDate,
      remark = '',
    } = req.body || {};
    if (![employeeId, materialType, title, materialId, condition, borrowDate, dueDate].every((value) => String(value || '').trim())) {
      return res.status(400).json({ success: false, message: 'Complete all required employee, material, and loan fields.' });
    }

    const borrowedAt = new Date(borrowDate);
    const dueAt = new Date(dueDate);
    if (Number.isNaN(borrowedAt.getTime()) || Number.isNaN(dueAt.getTime()) || dueAt < borrowedAt) {
      return res.status(400).json({ success: false, message: 'Enter valid loan dates and a due date on or after the borrowed date.' });
    }

    const employee = await Employee.findOne({ employeeId: String(employeeId).trim(), status: 'Active' })
      .select('employeeId fullName department position campus')
      .lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Active employee was not found.' });

    const clearance = await Clearance.findOne({
      employeeId: employee.employeeId,
      status: { $nin: ['Completed', 'Cancelled', 'Rejected', 'Final HR Clearance Completed'] },
    }).sort({ createdAt: -1 });

    const normalizedMaterialId = String(materialId).trim();
    const alreadyIssued = await LibraryClearance.exists({
      materials: {
        $elemMatch: {
          materialId: normalizedMaterialId,
          status: { $in: ['Borrowed', 'Outstanding', 'Overdue'] },
        },
      },
    });
    if (alreadyIssued) {
      return res.status(409).json({ success: false, message: 'This material is already assigned and has not been returned.' });
    }

    const requestId = clearance?.requestId || `LIB-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    let libraryRecord = await LibraryClearance.findOne({ requestId });
    if (!libraryRecord) {
      libraryRecord = new LibraryClearance({
        requestId,
        employeeId: employee.employeeId,
        employeeName: employee.fullName,
        department: employee.department,
        position: employee.position,
        campus: employee.campus,
      });
    }

    libraryRecord.materials.push({
      materialId: normalizedMaterialId,
      title: String(title).trim(),
      materialType: String(materialType).trim(),
      isbn: normalizedMaterialId,
      publicationYear: publicationYear ? Number(publicationYear) : null,
      condition: String(condition).trim(),
      borrowDate: borrowedAt,
      dueDate: dueAt,
      remark: String(remark).trim(),
      status: 'Borrowed',
    });
    libraryRecord.campus = employee.campus;
    libraryRecord.borrowedItemsStatus = 'Not Clear';
    const material = libraryRecord.materials[libraryRecord.materials.length - 1];
    await libraryRecord.save();
    if (clearance) await syncClearanceRequest(libraryRecord, material);

    return res.status(201).json({
      success: true,
      message: 'Library material assigned successfully.',
      record: libraryRecord,
      material,
    });
  } catch (error) {
    console.error('Issue library material error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign library material.' });
  }
};

const getActorName = (user) => user?.fullName || user?.name || user?.email || 'Library Officer';
const isActiveMaterial = (material) => (
  ['Borrowed', 'Outstanding', 'Overdue'].includes(material.status)
  || (material.status === 'Lost' && Number(material.fineAmount || 0) > Number(material.finePaidAmount || 0))
);

const syncClearanceRequest = async (libraryRecord, material) => {
  if (libraryRecord.requestId.startsWith('LIB-')) return;
  let clearance = await Clearance.findOne({ requestId: libraryRecord.requestId });
  if (!clearance) {
    clearance = await Clearance.findOne({
      employeeId: libraryRecord.employeeId,
      libraryStatus: { $nin: ['Completed', 'Approved'] },
    }).sort({ createdAt: -1 });
  }
  if (!clearance) return;

  const materials = Array.isArray(clearance.materials) ? clearance.materials : [];
  const index = materials.findIndex((item) => (
    (material._id && String(item._id) === String(material._id))
    || (item.materialId && item.materialId === material.materialId)
  ));
  const synchronizedMaterial = {
    ...(index >= 0 ? materials[index].toObject?.() || materials[index] : {}),
    _id: material._id,
    materialId: material.materialId,
    title: material.title,
    materialType: material.materialType,
    isbn: material.isbn,
    publicationYear: material.publicationYear,
    borrowDate: material.borrowDate,
    dueDate: material.dueDate,
    returnDate: material.returnDate,
    remark: material.remark || '',
    condition: material.condition,
    status: material.status,
    fineAmount: Number(material.fineAmount || 0),
    finePaidAmount: Number(material.finePaidAmount || 0),
    fineBalance: Math.max(0, Number(material.fineAmount || 0) - Number(material.finePaidAmount || 0)),
  };
  if (index >= 0) materials[index] = synchronizedMaterial;
  else materials.push(synchronizedMaterial);

  const hasUnresolvedMaterials = materials.some(isActiveMaterial);
  const outstandingFineAmount = Math.max(0, Number(libraryRecord.outstandingFineAmount || 0));
  clearance.set({
    materials,
    borrowedItemsStatus: hasUnresolvedMaterials ? 'Not Clear' : 'Clear',
    outstandingFineAmount,
    outstandingFineStatus: outstandingFineAmount > 0 ? 'Not Clear' : 'Clear',
  });

  const checklist = Array.isArray(clearance.libraryChecklist) ? [...clearance.libraryChecklist] : [];
  const checklistStatuses = {
    'Borrowed books and circulation records': hasUnresolvedMaterials ? 'Pending' : 'Cleared',
    'Outstanding fines and charges': outstandingFineAmount > 0 ? 'Pending' : 'Cleared',
  };
  for (const [name, status] of Object.entries(checklistStatuses)) {
    const item = checklist.find((entry) => entry.item === name);
    if (item) item.status = status;
    else checklist.push({ item: name, status, note: '' });
  }
  clearance.libraryChecklist = checklist;
  clearance.markModified('libraryChecklist');
  await clearance.save();
};

export const updateLibraryMaterial = async (req, res) => {
  try {
    const { requestId, materialId, action } = req.params;
    const { amount, note = '', dueDate, condition, status } = req.body || {};
    const record = await LibraryClearance.findOne({ requestId });
    if (!record) return res.status(404).json({ success: false, message: 'Library record was not found.' });

    let material = record.materials.id(materialId) || record.materials.find((item) => item.materialId === materialId);
    if (!material && record.materials.length === 0 && materialId === `${record._id}-0`) {
      material = record.materials.create({
        materialId: record.materialId || '',
        title: record.materialTitle || record.clearanceReason || 'Library material',
        materialType: record.materialType || '',
        borrowDate: record.borrowDate || record.submittedDate || record.createdAt,
        dueDate: record.dueDate || null,
        status: normalizeStatus(record),
      });
      record.materials.push(material);
    }
    if (!material) return res.status(404).json({ success: false, message: 'Material was not found in this library record.' });

    const fineAmount = Number(amount);
    let fineDelta = 0;
    const actor = getActorName(req.user);
    const now = new Date();
    if (['damage', 'lost', 'payment'].includes(action) && !String(note).trim()) {
      return res.status(400).json({ success: false, message: 'Add a reason or payment reference before continuing.' });
    }

    if (action === 'return') {
      if (material.status === 'Returned') return res.status(409).json({ success: false, message: 'This material is already marked as returned.' });
      if (material.status === 'Lost') return res.status(409).json({ success: false, message: 'A lost material cannot be marked returned. Record its recovery first.' });
      material.status = 'Returned';
      material.returnDate = now;
      if (condition) material.condition = condition;
      material.fineEvents.push({ type: 'Return', amount: 0, note, recordedBy: actor, recordedAt: now });
    } else if (action === 'damage' || action === 'lost') {
      if (!Number.isFinite(fineAmount) || fineAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a fine amount greater than zero.' });
      }
      if (action === 'lost' && material.status === 'Lost') {
        return res.status(409).json({ success: false, message: 'This material is already reported as lost.' });
      }
      if (action === 'damage' && material.condition === 'Damaged' && material.status === 'Returned') {
        return res.status(409).json({ success: false, message: 'This returned material is already reported as damaged.' });
      }
      material.status = action === 'lost' ? 'Lost' : 'Returned';
      material.condition = action === 'lost' ? 'Lost' : 'Damaged';
      if (action === 'damage') material.returnDate = now;
      material.fineAmount = Number(material.fineAmount || 0) + fineAmount;
      material.fineEvents.push({ type: action === 'lost' ? 'Lost' : 'Damaged', amount: fineAmount, note, recordedBy: actor, recordedAt: now });
      fineDelta = fineAmount;
    } else if (action === 'renew') {
      const nextDueDate = new Date(dueDate);
      if (!['Borrowed', 'Outstanding', 'Overdue'].includes(material.status)) {
        return res.status(409).json({ success: false, message: 'Only an active loan can be renewed.' });
      }
      if (!dueDate || Number.isNaN(nextDueDate.getTime()) || (material.dueDate && nextDueDate <= material.dueDate)) {
        return res.status(400).json({ success: false, message: 'Choose a valid due date later than the current due date.' });
      }
      material.dueDate = nextDueDate;
      material.status = 'Borrowed';
      material.fineEvents.push({ type: 'Renewal', amount: 0, note, recordedBy: actor, recordedAt: now });
    } else if (action === 'payment') {
      const materialBalance = Math.max(0, Number(material.fineAmount || 0) - Number(material.finePaidAmount || 0));
      const materialFineBalance = record.materials.reduce(
        (total, item) => total + Math.max(0, Number(item.fineAmount || 0) - Number(item.finePaidAmount || 0)),
        0,
      );
      const legacyFineBalance = Math.max(0, Number(record.outstandingFineAmount || 0) - materialFineBalance);
      const isFirstMaterial = record.materials[0]._id.equals(material._id);
      const balance = materialBalance + (isFirstMaterial ? legacyFineBalance : 0);
      if (!Number.isFinite(fineAmount) || fineAmount <= 0 || fineAmount > balance) {
        return res.status(400).json({ success: false, message: `Enter a payment between 0.01 and ${balance.toFixed(2)} ETB.` });
      }
      if (isFirstMaterial && legacyFineBalance > 0) material.fineAmount = Number(material.fineAmount || 0) + legacyFineBalance;
      material.finePaidAmount = Number(material.finePaidAmount || 0) + fineAmount;
      material.fineEvents.push({ type: 'Payment', amount: fineAmount, note, recordedBy: actor, recordedAt: now });
      fineDelta = -fineAmount;
    } else if (action === 'adjust') {
      const nextFineAmount = Number(amount);
      const allowedStatuses = ['Borrowed', 'Outstanding', 'Overdue', 'Returned', 'Lost'];
      const allowedConditions = ['Good', 'Fair', 'Damaged', 'Lost'];
      if (!Number.isFinite(nextFineAmount) || nextFineAmount < Number(material.finePaidAmount || 0)) {
        return res.status(400).json({ success: false, message: 'Fine amount must be at least the amount already paid.' });
      }
      if (!allowedConditions.includes(condition) || !allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Choose a valid material condition and status.' });
      }
      fineDelta = nextFineAmount - Number(material.fineAmount || 0);
      material.fineAmount = nextFineAmount;
      material.condition = condition;
      material.status = status;
      if (status === 'Returned' && !material.returnDate) material.returnDate = now;
      if (['Borrowed', 'Outstanding', 'Overdue'].includes(status)) material.returnDate = null;
      material.fineEvents.push({
        type: 'Adjustment',
        amount: Math.abs(fineDelta),
        note: String(note || 'Material condition or fine adjusted'),
        recordedBy: actor,
        recordedAt: now,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported material action.' });
    }

    const activeMaterials = record.materials.filter(isActiveMaterial);
    record.borrowedItemsStatus = activeMaterials.length ? 'Not Clear' : 'Clear';
    record.outstandingFineAmount = Math.max(0, Number(record.outstandingFineAmount || 0) + fineDelta);
    record.outstandingFineStatus = record.outstandingFineAmount > 0 ? 'Not Clear' : 'Clear';
    await record.save();

    await syncClearanceRequest(record, material);
    return res.status(200).json({
      success: true,
      message: 'Library material updated.',
      record: record.toObject(),
      material: material.toObject(),
    });
  } catch (error) {
    console.error('Library material update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update library material.' });
  }
};