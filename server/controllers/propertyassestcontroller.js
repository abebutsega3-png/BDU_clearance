import Asset from '../models/propertyAsset.js';
import Employee from '../models/employee.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ASSET_TYPES = ['Laptop', 'Desktop', 'Printer', 'Monitor', 'Furniture', 'Vehicle', 'Other'];
const ASSET_CONDITIONS = ['New', 'Good', 'Fair', 'Damaged', 'Lost'];
const DEFAULT_ASSET_STATUSES = ['Available', 'Assigned', 'Outstanding', 'Damaged', 'Lost', 'Under Maintenance'];
const KNOWN_CAMPUSES = ['Main Campus', 'Woreta Campus', 'Medical Campus', 'Tibebe Ghion Campus'];
const containsLettersOnly = (value) => /\p{L}/u.test(value) && !/[\p{N}]/u.test(value);
const isValidPurchaseDate = (value, required = false) => {
  if (!value) return !required;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return value <= todayString;
};
const isUnassignedEmployee = (value) => {
  const employeeId = String(value || '').trim();
  return !employeeId || employeeId.toLowerCase() === 'n/a';
};

const normalizeStatus = (status) => {
  const value = (status || '').toString().trim();
  if (!value) return 'Outstanding';

  const lower = value.toLowerCase();
  if (lower === 'returned') return 'Returned';
  if (lower === 'assigned' || lower === 'in use') return 'Assigned';
  if (lower === 'available' || lower === 'in store') return 'Available';
  if (lower === 'under maintenance' || lower === 'maintenance') return 'Under Maintenance';
  if (lower === 'outstanding' || lower === 'unreturned' || lower === 'overdue') return 'Outstanding';
  if (lower === 'damaged') return 'Damaged';
  if (lower === 'lost') return 'Lost';

  return value;
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

const mapAssetRecord = (record) => ({
  id: record._id?.toString?.() || record.assetId,
  assetId: record.assetId || 'AST-UNKNOWN',
  assetName: record.assetName || 'Unknown Asset',
  serialNumber: record.serialNumber || '',
  handoverVoucher: record.handoverVoucher || '',
  model: record.model || '',
  employeeName: record.employeeName || 'Unknown Employee',
  employeeId: record.employeeId || 'N/A',
  department: record.department || 'N/A',
  assetType: record.assetType || record.category || 'General Equipment',
  category: record.category || record.assetType || 'General Equipment',
  campus: record.campus || 'Main Campus',
  assignedDate: record.assignedDate || record.createdAt || null,
  returnDate: record.returnDate || null,
  purchaseDate: record.purchaseDate || null,
  purchaseValue: Number(record.purchaseValue) || 0,
  location: record.location || '',
  status: normalizeStatus(record.status),
  condition: record.condition || 'Good',
  remarks: record.remarks || '',
  history: Array.isArray(record.history)
    ? record.history.map((item) => ({
        date: formatDate(item.date || item.createdAt),
        action: item.action || item.note || 'Updated'
      }))
    : []
});

const isPropertyOfficer = (req) => {
  const role = String(req.user?.role || '').toLowerCase();
  return role.includes('property') || role.includes('system admin');
};

const appendAssetHistory = (asset, action) => {
  if (!Array.isArray(asset.history)) asset.history = [];
  asset.history.push({ date: new Date(), action });
};

export const searchAssignableEmployees = async (req, res) => {
  if (!isPropertyOfficer(req)) {
    return res.status(403).json({ success: false, message: 'Only Property Officers can search employees for asset assignment.' });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database unavailable. Please check the MongoDB connection and try again.'
    });
  }

  const searchTerm = String(req.query.search || '').trim();
  if (!searchTerm) {
    return res.status(200).json({ success: true, employees: [] });
  }

  if (searchTerm.length > 100) {
    return res.status(400).json({ success: false, message: 'Employee search must be 100 characters or fewer.' });
  }

  try {
    const matcher = new RegExp(escapeRegExp(searchTerm), 'i');
    const employees = await Employee.find({
      status: 'Active',
      $or: [
        { employeeId: matcher },
        { fullName: matcher }
      ]
    })
      .select('employeeId fullName department')
      .sort({ employeeId: 1 })
      .limit(8)
      .maxTimeMS(10000)
      .lean();

    return res.status(200).json({ success: true, employees });
  } catch (error) {
    console.error('Error searching active employees for asset assignment:', error);
    const timedOut = error.code === 50 || (error.name === 'MongooseError' && /timed out/i.test(error.message));
    return res.status(timedOut ? 503 : 500).json({
      success: false,
      message: timedOut
        ? 'Employee search timed out. Please try again.'
        : 'Unable to search employees in the database.'
    });
  }
};

export const getPropertyAssetRecords = async (req, res) => {
  try {
    const { search = '', status = 'All', assetType = 'All', department = 'All', campus = 'All', employeeId = '' } = req.query;
    const query = {};
    const searchTerm = String(search || '').trim();
    const employeeIdFilter = String(employeeId || '').trim();

    if (employeeIdFilter) {
      query.employeeId = employeeIdFilter;
    } else if (searchTerm) {
      query.$or = [
        { employeeName: { $regex: searchTerm, $options: 'i' } },
        { employeeId: { $regex: searchTerm, $options: 'i' } },
        { assetId: { $regex: searchTerm, $options: 'i' } },
        { assetName: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (status && status !== 'All') {
      query.status = normalizeStatus(status);
    }

    if (assetType && assetType !== 'All') {
      query.assetType = assetType;
    }

    if (department && department !== 'All') {
      query.department = department;
    }

    if (campus && campus !== 'All') {
      query.campus = campus;
    }

    const records = await Asset.find(query).sort({ assignedDate: -1, updatedAt: -1 }).lean();
    const mapped = records.map(mapAssetRecord);

    const uniqueAssetTypes = [...new Set(records.map((item) => item.category || item.assetType || 'General Equipment').filter(Boolean))];
    const departments = [...new Set(records.map((item) => item.department).filter(Boolean))];
    const campuses = [...new Set(records.map((item) => item.campus).filter(Boolean))];

    res.status(200).json({
      success: true,
      total: mapped.length,
      records: mapped,
      outstandingAssets: mapped.filter((item) => item.status === 'Outstanding'),
      filters: {
        assetTypes: uniqueAssetTypes,
        departments,
        campuses
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employee asset records',
      error: error.message
    });
  }
};

export const createPropertyAsset = async (req, res) => {
  try {
    if (!isPropertyOfficer(req)) {
      return res.status(403).json({ success: false, message: 'Only Property Officers can register assets.' });
    }
    const {
      assetId,
      assetName,
      serialNumber = '',
      handoverVoucher = '',
      model = '',
      assetType = 'General Equipment',
      category = assetType,
      employeeId = '',
      campus = 'Main Campus',
      assignedDate,
      purchaseDate,
      purchaseValue,
      location = '',
      status,
      condition = 'Good',
      remarks = ''
    } = req.body || {};

    const cleanAssetId = String(assetId || '').trim();
    const cleanAssetName = String(assetName || '').trim();
    const cleanCategory = String(category || '').trim();
    const cleanAssetType = String(assetType || '').trim();
    const cleanModel = String(model || '').trim();
    const cleanSerialNumber = String(serialNumber || '').trim();
    const cleanVoucher = String(handoverVoucher || '').trim();
    const cleanCampus = String(campus || '').trim();
    const cleanLocation = String(location || '').trim();
    const purchaseValueText = String(purchaseValue ?? '').trim();

    if (!/^[A-Za-z0-9-]+$/.test(cleanAssetId)) {
      return res.status(400).json({ success: false, message: 'Asset tag may contain only letters, numbers, and hyphens.' });
    }
    if (!containsLettersOnly(cleanAssetName)) {
      return res.status(400).json({ success: false, message: 'Asset name must contain letters and cannot be numeric.' });
    }
    if (!cleanCategory) {
      return res.status(400).json({ success: false, message: 'Asset category is required.' });
    }
    if (!ASSET_TYPES.includes(cleanAssetType)) {
      return res.status(400).json({ success: false, message: 'Select a valid asset type.' });
    }
    if (!cleanModel || !/\p{L}/u.test(cleanModel)) {
      return res.status(400).json({ success: false, message: 'Model / Make is required and must contain letters.' });
    }
    if (!/^[A-Za-z0-9-]+$/.test(cleanSerialNumber)) {
      return res.status(400).json({ success: false, message: 'Serial number is required and may contain only letters, numbers, and hyphens.' });
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(purchaseValueText)) {
      return res.status(400).json({ success: false, message: 'Purchase value must be a non-negative number with up to two decimal places.' });
    }
    if (!isValidPurchaseDate(purchaseDate || '', true)) {
      return res.status(400).json({ success: false, message: 'Purchase date must be a valid date and cannot be in the future.' });
    }
    if (!ASSET_CONDITIONS.includes(String(condition || '').trim())) {
      return res.status(400).json({ success: false, message: 'Select a valid asset condition.' });
    }
    if (cleanVoucher && !/^[A-Za-z0-9-]+$/.test(cleanVoucher)) {
      return res.status(400).json({ success: false, message: 'Voucher number may contain only letters, numbers, and hyphens.' });
    }
    if (!cleanLocation) {
      return res.status(400).json({ success: false, message: 'Building / Room / Store Location is required.' });
    }

    const userSettings = await User.findById(req.user._id).select('propertySettings.assetCategories propertySettings.assetStatuses').lean();
    const categories = userSettings?.propertySettings?.assetCategories || [];
    const matchingCategory = categories.find((item) => item.name?.toLowerCase() === cleanCategory.toLowerCase());
    if (!matchingCategory || matchingCategory.enabled === false) {
      return res.status(400).json({ success: false, message: 'Select an active asset category.' });
    }
    const allowedStatuses = new Set([
      ...DEFAULT_ASSET_STATUSES,
      ...(userSettings?.propertySettings?.assetStatuses || []).map((item) => item.name).filter(Boolean),
    ]);
    const cleanStatus = String(status || (employeeId ? 'Assigned' : 'Available')).trim();
    if (!allowedStatuses.has(cleanStatus)) {
      return res.status(400).json({ success: false, message: 'Select a valid inventory status.' });
    }
    const knownCampuses = new Set([
      ...KNOWN_CAMPUSES,
      ...(await Asset.distinct('campus')).filter(Boolean),
    ]);
    if (!knownCampuses.has(cleanCampus)) {
      return res.status(400).json({ success: false, message: 'Select a valid campus.' });
    }

    const value = Number(purchaseValueText);
    if (!Number.isFinite(value) || value < 0) {
      return res.status(400).json({ success: false, message: 'Purchase value must be a non-negative number.' });
    }
    const resolvedAssetId = String(assetId || `BDU/PA/${randomUUID().slice(0, 8).toUpperCase()}`).trim();
    if (await Asset.exists({ assetId: resolvedAssetId })) {
      return res.status(409).json({ success: false, message: 'An asset with this ID already exists.' });
    }
    if (await Asset.exists({ serialNumber: cleanSerialNumber })) {
      return res.status(409).json({ success: false, message: 'An asset with this serial number already exists.' });
    }
    const resolvedEmployeeId = isUnassignedEmployee(employeeId) ? '' : String(employeeId).trim();
    if (resolvedEmployeeId && !/^[A-Za-z0-9-]+$/.test(resolvedEmployeeId)) {
      return res.status(400).json({ success: false, message: 'Employee ID format is invalid. Select the employee from the search results.' });
    }
    const assigned = Boolean(resolvedEmployeeId);
    const employee = assigned
      ? await Employee.findOne({ employeeId: resolvedEmployeeId, status: 'Active' })
        .select('employeeId fullName department')
        .lean()
      : null;
    if (assigned && !employee) {
      return res.status(400).json({ success: false, message: 'Select an active employee from the employee list.' });
    }
    if (assigned && (!containsLettersOnly(employee.fullName || '') || !containsLettersOnly(employee.department || ''))) {
      return res.status(400).json({ success: false, message: 'The selected employee must have a valid name and department in the employee record.' });
    }
    const initialStatus = status || (assigned ? 'Assigned' : 'Available');
    const asset = await Asset.create({
      assetId: resolvedAssetId,
      assetName: cleanAssetName,
      serialNumber: cleanSerialNumber,
      handoverVoucher: cleanVoucher,
      model: cleanModel,
      assetType: cleanAssetType,
      category: cleanCategory,
      employeeName: assigned ? employee.fullName : 'Unknown Employee',
      employeeId: assigned ? employee.employeeId : 'N/A',
      department: assigned ? employee.department || 'N/A' : 'N/A',
      campus: cleanCampus,
      assignedDate: assignedDate || (assigned ? new Date() : null),
      purchaseDate: purchaseDate || null,
      purchaseValue: value,
      location: cleanLocation,
      status: initialStatus,
      condition: String(condition || 'Good').trim(),
      remarks: String(remarks).trim(),
      history: [{ date: new Date(), action: 'Asset registered' }]
    });
    res.status(201).json({ success: true, asset: mapAssetRecord(asset.toObject()) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error registering asset', error: error.message });
  }
};

export const updatePropertyAsset = async (req, res) => {
  try {
    if (!isPropertyOfficer(req)) {
      return res.status(403).json({ success: false, message: 'Only Property Officers can edit assets.' });
    }
    const asset = await Asset.findOne({ assetId: req.params.assetId });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });
    const originalAssetType = asset.assetType;
    const originalStatus = asset.status;
    const originalCategory = asset.category;
    if (Object.hasOwn(req.body || {}, 'purchaseDate')
      && !isValidPurchaseDate(String(req.body.purchaseDate || '').slice(0, 10), Boolean(req.body.purchaseDate))) {
      return res.status(400).json({ success: false, message: 'Purchase date must be a valid date and cannot be in the future.' });
    }

    const fields = ['assetName', 'serialNumber', 'handoverVoucher', 'model', 'assetType', 'category', 'employeeId', 'campus', 'assignedDate', 'purchaseDate', 'purchaseValue', 'location', 'status', 'condition', 'remarks'];
    for (const field of fields) {
      if (Object.hasOwn(req.body || {}, field)) asset[field] = req.body[field];
    }
    if (Object.hasOwn(req.body || {}, 'employeeId')) {
      const employeeId = isUnassignedEmployee(req.body.employeeId) ? '' : String(req.body.employeeId).trim();
      if (employeeId && !/^[A-Za-z0-9-]+$/.test(employeeId)) {
        return res.status(400).json({ success: false, message: 'Employee ID format is invalid. Select the employee from the search results.' });
      }
      if (employeeId) {
        const employee = await Employee.findOne({ employeeId, status: 'Active' })
          .select('employeeId fullName department')
          .lean();
        if (!employee) {
          return res.status(400).json({ success: false, message: 'Select an active employee from the employee list.' });
        }
        if (!containsLettersOnly(employee.fullName || '') || !containsLettersOnly(employee.department || '')) {
          return res.status(400).json({ success: false, message: 'The selected employee must have a valid name and department in the employee record.' });
        }
        asset.employeeId = employee.employeeId;
        asset.employeeName = employee.fullName;
        asset.department = employee.department || 'N/A';
      } else {
        asset.employeeId = 'N/A';
        asset.employeeName = 'Unknown Employee';
        asset.department = 'N/A';
      }
    }
    if (Object.hasOwn(req.body || {}, 'assetId') && !/^[A-Za-z0-9-]+$/.test(String(req.body.assetId || '').trim())) {
      return res.status(400).json({ success: false, message: 'Asset tag may contain only letters, numbers, and hyphens.' });
    }
    if (!containsLettersOnly(String(asset.assetName || '').trim())) {
      return res.status(400).json({ success: false, message: 'Asset name must contain letters and cannot be numeric.' });
    }
    if (!String(asset.category || '').trim()) {
      return res.status(400).json({ success: false, message: 'Asset category is required.' });
    }
    const userSettings = await User.findById(req.user._id).select('propertySettings.assetCategories propertySettings.assetStatuses').lean();
    const categories = userSettings?.propertySettings?.assetCategories || [];
    const matchingCategory = categories.find((item) => item.name?.toLowerCase() === String(asset.category).trim().toLowerCase());
    const categoryIsHistorical = !Object.hasOwn(req.body || {}, 'category') && !matchingCategory;
    const categoryWasUnchanged = String(asset.category || '').trim().toLowerCase() === String(originalCategory || '').trim().toLowerCase();
    if ((!matchingCategory && !categoryIsHistorical || matchingCategory?.enabled === false) && !categoryWasUnchanged) {
      return res.status(400).json({ success: false, message: 'Select an active asset category.' });
    }
    if (!ASSET_TYPES.includes(String(asset.assetType || '').trim()) && String(asset.assetType || '').trim() !== String(originalAssetType || '').trim()) {
      return res.status(400).json({ success: false, message: 'Select a valid asset type.' });
    }
    if (!String(asset.model || '').trim() || !/\p{L}/u.test(String(asset.model).trim())) {
      return res.status(400).json({ success: false, message: 'Model / Make is required and must contain letters.' });
    }
    if (!/^[A-Za-z0-9-]+$/.test(String(asset.serialNumber || '').trim())) {
      return res.status(400).json({ success: false, message: 'Serial number is required and may contain only letters, numbers, and hyphens.' });
    }
    const purchaseDateString = asset.purchaseDate instanceof Date
      ? asset.purchaseDate.toISOString().slice(0, 10)
      : String(asset.purchaseDate || '').slice(0, 10);
    if (!isValidPurchaseDate(purchaseDateString, true)) {
      return res.status(400).json({ success: false, message: 'Purchase date must be a valid date and cannot be in the future.' });
    }
    if (!ASSET_CONDITIONS.includes(String(asset.condition || '').trim())) {
      return res.status(400).json({ success: false, message: 'Select a valid asset condition.' });
    }
    const configuredStatuses = (userSettings?.propertySettings?.assetStatuses || []).map((item) => item.name).filter(Boolean);
    if (![...DEFAULT_ASSET_STATUSES, ...configuredStatuses].includes(String(asset.status || '').trim())
      && String(asset.status || '').trim() !== String(originalStatus || '').trim()) {
      return res.status(400).json({ success: false, message: 'Select a valid inventory status.' });
    }
    const campusValues = new Set([...KNOWN_CAMPUSES, ...(await Asset.distinct('campus')).filter(Boolean)]);
    if (!campusValues.has(String(asset.campus || '').trim())) {
      return res.status(400).json({ success: false, message: 'Select a valid campus.' });
    }
    if (String(asset.handoverVoucher || '').trim() && !/^[A-Za-z0-9-]+$/.test(String(asset.handoverVoucher).trim())) {
      return res.status(400).json({ success: false, message: 'Voucher number may contain only letters, numbers, and hyphens.' });
    }
    if (!String(asset.location || '').trim()) {
      return res.status(400).json({ success: false, message: 'Building / Room / Store Location is required.' });
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(String(asset.purchaseValue ?? '').trim())
      || !Number.isFinite(Number(asset.purchaseValue))
      || Number(asset.purchaseValue) < 0) {
      return res.status(400).json({ success: false, message: 'Purchase value must be a non-negative number with up to two decimal places.' });
    }
    if (asset.serialNumber && await Asset.exists({ serialNumber: asset.serialNumber, _id: { $ne: asset._id } })) {
      return res.status(409).json({ success: false, message: 'An asset with this serial number already exists.' });
    }
    appendAssetHistory(asset, 'Asset details updated');
    await asset.save();
    res.status(200).json({ success: true, asset: mapAssetRecord(asset.toObject()) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating asset', error: error.message });
  }
};

export const returnPropertyAssetToStore = async (req, res) => {
  try {
    if (!isPropertyOfficer(req)) {
      return res.status(403).json({ success: false, message: 'Only Property Officers can return assets to store.' });
    }
    const asset = await Asset.findOne({ assetId: req.params.assetId });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });
    if (!asset.employeeId || asset.employeeId === 'N/A') {
      return res.status(409).json({ success: false, message: 'This asset is not assigned to an employee.' });
    }

    const returnedAt = new Date();
    if (!Array.isArray(asset.assignmentHistory)) asset.assignmentHistory = [];
    asset.assignmentHistory.push({
      employeeName: asset.employeeName,
      employeeId: asset.employeeId,
      department: asset.department,
      assignedDate: asset.assignedDate,
      returnedDate: returnedAt,
      status: 'Returned',
      remarks: String(req.body?.remarks || 'Returned to property store')
    });
    asset.employeeName = 'Unknown Employee';
    asset.employeeId = 'N/A';
    asset.department = 'N/A';
    asset.status = 'Available';
    asset.returnDate = returnedAt;
    if (!asset.location) asset.location = 'Property Store';
    appendAssetHistory(asset, 'Unassigned and returned to Property Store');
    await asset.save();
    res.status(200).json({ success: true, asset: mapAssetRecord(asset.toObject()) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error returning asset to store', error: error.message });
  }
};

export const getPropertyAssetById = async (req, res) => {
  try {
    const { assetId } = req.params;
    const record = await Asset.findOne({ $or: [{ assetId }, { _id: assetId }] }).lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.status(200).json({
      success: true,
      asset: mapAssetRecord(record)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching asset details',
      error: error.message
    });
  }
};
