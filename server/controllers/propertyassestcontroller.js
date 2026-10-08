import Asset from '../models/propertyAsset.js';
import { randomUUID } from 'node:crypto';

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
      employeeName = '',
      employeeId = '',
      department = '',
      campus = 'Main Campus',
      assignedDate,
      purchaseDate,
      purchaseValue = 0,
      location = '',
      status,
      condition = 'Good',
      remarks = ''
    } = req.body || {};

    if (!String(assetName || '').trim()) {
      return res.status(400).json({ success: false, message: 'Asset name is required.' });
    }
    const value = Number(purchaseValue);
    if (!Number.isFinite(value) || value < 0) {
      return res.status(400).json({ success: false, message: 'Purchase value must be a non-negative number.' });
    }
    const resolvedAssetId = String(assetId || `BDU/PA/${randomUUID().slice(0, 8).toUpperCase()}`).trim();
    if (await Asset.exists({ assetId: resolvedAssetId })) {
      return res.status(409).json({ success: false, message: 'An asset with this ID already exists.' });
    }
    if (serialNumber && await Asset.exists({ serialNumber: String(serialNumber).trim() })) {
      return res.status(409).json({ success: false, message: 'An asset with this serial number already exists.' });
    }
    const assigned = Boolean(String(employeeId).trim());
    const initialStatus = status || (assigned ? 'Assigned' : 'Available');
    const asset = await Asset.create({
      assetId: resolvedAssetId,
      assetName: String(assetName).trim(),
      serialNumber: String(serialNumber).trim(),
      handoverVoucher: String(handoverVoucher).trim(),
      model: String(model).trim(),
      assetType: String(assetType || category).trim(),
      category: String(category || assetType).trim(),
      employeeName: assigned ? String(employeeName || 'Unknown Employee').trim() : 'Unknown Employee',
      employeeId: assigned ? String(employeeId).trim() : 'N/A',
      department: assigned ? String(department || 'N/A').trim() : 'N/A',
      campus: String(campus || 'Main Campus').trim(),
      assignedDate: assignedDate || (assigned ? new Date() : null),
      purchaseDate: purchaseDate || null,
      purchaseValue: value,
      location: String(location).trim(),
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

    const fields = ['assetName', 'serialNumber', 'handoverVoucher', 'model', 'assetType', 'category', 'employeeName', 'employeeId', 'department', 'campus', 'assignedDate', 'purchaseDate', 'purchaseValue', 'location', 'status', 'condition', 'remarks'];
    for (const field of fields) {
      if (Object.hasOwn(req.body || {}, field)) asset[field] = req.body[field];
    }
    if (!String(asset.assetName || '').trim()) {
      return res.status(400).json({ success: false, message: 'Asset name is required.' });
    }
    if (asset.purchaseValue != null && (!Number.isFinite(Number(asset.purchaseValue)) || Number(asset.purchaseValue) < 0)) {
      return res.status(400).json({ success: false, message: 'Purchase value must be a non-negative number.' });
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
