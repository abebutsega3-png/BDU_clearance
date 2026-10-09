import ICTAsset from '../models/ICTAsset.js';
import Employee from '../models/employee.js';

const assetTypes = [
  'Laptop', 'Desktop Computer', 'Monitor', 'Printer', 'Tablet',
  'Mobile Phone', 'Projector', 'Keyboard', 'Mouse', 'UPS',
  'Network Device', 'IP Phone', 'Other ICT Equipment'
];
const assetConditions = ['New', 'Good', 'Fair', 'Refurbished', 'Damaged', 'Lost'];
const assetStatuses = ['Available', 'Assigned', 'Returned', 'Damaged', 'Lost', 'Under Repair', 'Under Maintenance'];
const hasLetters = (value) => /[\p{L}]/u.test(String(value || '').trim());
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isValidCalendarDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const isOptionalValidDate = (value) => !value || (isValidCalendarDate(value) && value <= today());

export const getAllAssets = async (req, res) => {
  try {
    const { status, assetType, campus, search } = req.query;
    const query = {};

    if (status) query.assetStatus = status;
    if (assetType) query.assetType = assetType;
    if (campus) query.campus = campus;

    if (search) {
      query.$or = [
        { assetId: new RegExp(search, 'i') },
        { serialNumber: new RegExp(search, 'i') },
        { 'currentAssignment.employeeName': new RegExp(search, 'i') },
        { 'currentAssignment.employeeId': new RegExp(search, 'i') }
      ];
    }

    const assets = await ICTAsset.find(query).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: assets.length, data: assets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const registerAsset = async (req, res) => {
  try {
    const {
      assetId,
      serialNumber,
      assetName,
      assetType,
      brand,
      model,
      notes,
      condition,
      purchaseDate,
      campus,
      location,
      assetStatus = 'Available',
      assignment,
      performedBy
    } = req.body;

    const cleanAssetId = String(assetId || '').trim().toUpperCase();
    const cleanSerialNumber = String(serialNumber || '').trim().toUpperCase();
    const cleanAssetName = String(assetName || '').trim();
    const cleanBrand = String(brand || '').trim();
    const cleanModel = String(model || '').trim();
    const cleanCampus = String(campus || '').trim();

    if (!cleanAssetId || !/^[A-Z0-9-]+$/.test(cleanAssetId)) {
      return res.status(400).json({ success: false, message: 'Asset ID is required and may contain letters, numbers, and hyphens only.' });
    }
    if (!cleanSerialNumber || !/^[A-Z0-9][A-Z0-9: -]*[A-Z0-9]$/.test(cleanSerialNumber)) {
      return res.status(400).json({ success: false, message: 'Serial Number must contain letters or numbers; spaces, hyphens, and colons are also allowed.' });
    }
    if (!hasLetters(cleanAssetName)) {
      return res.status(400).json({ success: false, message: 'Asset Name is required and cannot contain numbers only.' });
    }
    if (!assetTypes.includes(assetType)) {
      return res.status(400).json({ success: false, message: 'Select a valid asset category/type.' });
    }
    if (!hasLetters(cleanBrand) || !hasLetters(cleanModel)) {
      return res.status(400).json({ success: false, message: 'Brand and Model are required and cannot contain numbers only.' });
    }
    if (!assetConditions.includes(condition || 'Good')) {
      return res.status(400).json({ success: false, message: 'Select a valid asset condition.' });
    }
    if (!assetStatuses.includes(assetStatus)) {
      return res.status(400).json({ success: false, message: 'Select a valid asset status.' });
    }
    if (!isOptionalValidDate(purchaseDate)) {
      return res.status(400).json({ success: false, message: 'Purchase Date must be a valid date and cannot be in the future.' });
    }
    if (assetStatus !== 'Assigned' && (!hasLetters(cleanCampus))) {
      return res.status(400).json({ success: false, message: 'Campus is required and cannot contain numbers only.' });
    }

    let activeEmployee = null;
    let assignmentDate;
    let dueDate;
    if (assetStatus === 'Assigned') {
      if (!assignment?.employeeId) {
        return res.status(400).json({ success: false, message: 'Select an active employee before assigning the asset.' });
      }
      activeEmployee = await Employee.findOne({ employeeId: String(assignment.employeeId).trim(), status: 'Active' })
        .select('employeeId fullName department campus');
      if (!activeEmployee || !hasLetters(activeEmployee.fullName) || !hasLetters(activeEmployee.department) || !hasLetters(activeEmployee.campus)) {
        return res.status(400).json({ success: false, message: 'The selected employee is not active or has incomplete profile details.' });
      }
      assignmentDate = assignment.assignedDate;
      dueDate = assignment.returnDueDate;
      if (!isValidCalendarDate(assignmentDate) || assignmentDate > today()) {
        return res.status(400).json({ success: false, message: 'Assignment Date must be valid and cannot be in the future.' });
      }
      if (!isValidCalendarDate(dueDate) || dueDate <= assignmentDate || dueDate <= today()) {
        return res.status(400).json({ success: false, message: 'Return / Renewal Due Date must be a future date after the Assignment Date.' });
      }
    }

    const existingAsset = await ICTAsset.findOne({
      $or: [
        { assetId: new RegExp(`^${escapeRegExp(cleanAssetId)}$`, 'i') },
        { serialNumber: new RegExp(`^${escapeRegExp(cleanSerialNumber)}$`, 'i') }
      ]
    });

    if (existingAsset) {
      return res.status(400).json({ success: false, message: 'Asset ID or Serial Number already exists.' });
    }

    const newAsset = new ICTAsset({
      assetId: cleanAssetId,
      serialNumber: cleanSerialNumber,
      assetName: cleanAssetName,
      assetType,
      brand: cleanBrand,
      model: cleanModel,
      notes: notes || '',
      condition: condition || 'Good',
      purchaseDate,
      campus: assetStatus === 'Assigned' ? activeEmployee.campus : cleanCampus,
      location: location || 'ICT Office',
      assetStatus,
      ...(assetStatus === 'Assigned' && {
        currentAssignment: {
          employeeId: activeEmployee.employeeId,
          employeeName: activeEmployee.fullName,
          department: activeEmployee.department,
          campus: activeEmployee.campus,
          assignedDate: assignmentDate,
          returnDueDate: dueDate,
          conditionAtAssignment: condition || 'Good',
          assignedBy: performedBy || 'ICT Officer',
          domainAccessGranted: Boolean(assignment.domainAccessGranted),
          remarks: assignment.remarks || ''
        }
      }),
      history: [{
        action: 'REGISTERED',
        condition: condition || 'Good',
        performedBy: performedBy || 'ICT Officer',
        notes: notes || 'Initial registration into ICT inventory.'
      }, ...(assetStatus === 'Assigned'
        ? [{
            action: 'ASSIGNED',
            employeeId: activeEmployee.employeeId,
            employeeName: activeEmployee.fullName,
            department: activeEmployee.department,
            condition: condition || 'Good',
            performedBy: performedBy || 'ICT Officer',
            notes: assignment.remarks || 'Assigned to employee during registration.'
          }]
        : [])]
    });

    await newAsset.save();
    res.status(201).json({ success: true, data: newAsset });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const assignAsset = async (req, res) => {
  try {
    const {
      assetId,
      employeeId,
      campus,
      assignedDate,
      returnDueDate,
      conditionAtAssignment,
      domainAccessGranted,
      assignedBy,
      remarks
    } = req.body;

    if (!assetId || !employeeId) {
      return res.status(400).json({ success: false, message: 'Asset ID and employee are required.' });
    }
    const employee = await Employee.findOne({ employeeId: String(employeeId).trim(), status: 'Active' })
      .select('employeeId fullName department campus');
    if (!employee || !hasLetters(employee.fullName) || !hasLetters(employee.department) || !hasLetters(employee.campus)) {
      return res.status(400).json({ success: false, message: 'Select an active employee with complete profile details.' });
    }
    const assignmentDay = assignedDate || today();
    const dueDay = returnDueDate || '';
    if (!isValidCalendarDate(assignmentDay) || assignmentDay > today()) {
      return res.status(400).json({ success: false, message: 'Assignment Date must be valid and cannot be in the future.' });
    }
    if (!isValidCalendarDate(dueDay) || dueDay <= assignmentDay || dueDay <= today()) {
      return res.status(400).json({ success: false, message: 'Return / Renewal Due Date must be a future date after the Assignment Date.' });
    }

    const asset = await ICTAsset.findOne({ assetId: String(assetId).trim().toUpperCase() });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    if (asset.assetStatus === 'Assigned') {
      return res.status(400).json({ success: false, message: 'Asset is already assigned.' });
    }

    asset.assetStatus = 'Assigned';
    asset.currentAssignment = {
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      department: employee.department,
      campus: employee.campus || campus || asset.campus,
      assignedDate: assignmentDay,
      returnDueDate: dueDay,
      conditionAtAssignment: conditionAtAssignment || 'Good',
      assignedBy: assignedBy || 'ICT Officer',
      domainAccessGranted: Boolean(domainAccessGranted),
      remarks
    };

    asset.history.push({
      action: 'ASSIGNED',
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      department: employee.department,
      condition: conditionAtAssignment || 'Good',
      performedBy: assignedBy || 'ICT Officer',
      notes: remarks || 'Assigned to employee'
    });

    await asset.save();
    res.status(200).json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const returnAsset = async (req, res) => {
  try {
    const { assetId, conditionAtReturn, accessoriesReturned, remarks, processedBy } = req.body;

    const asset = await ICTAsset.findOne({ assetId: assetId.toUpperCase() });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    const prevAssignment = { ...asset.currentAssignment };

    asset.assetStatus = (conditionAtReturn === 'Damaged' || conditionAtReturn === 'Lost')
      ? conditionAtReturn
      : 'Returned';
    asset.condition = conditionAtReturn;

    asset.history.push({
      action: 'RETURNED',
      employeeId: prevAssignment.employeeId || 'N/A',
      employeeName: prevAssignment.employeeName || 'N/A',
      department: prevAssignment.department || 'N/A',
      condition: conditionAtReturn,
      performedBy: processedBy || 'ICT Officer',
      notes: `Accessories: ${JSON.stringify(accessoriesReturned || {})}. Remarks: ${remarks || ''}`
    });

    asset.currentAssignment = undefined;

    await asset.save();
    res.status(200).json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getOutstandingAssets = async (req, res) => {
  try {
    const { employeeId } = req.query;
    const query = { assetStatus: 'Assigned' };

    if (employeeId) query['currentAssignment.employeeId'] = employeeId;

    const assets = await ICTAsset.find(query).sort({ 'currentAssignment.assignedDate': 1 });
    res.status(200).json({ success: true, count: assets.length, data: assets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};