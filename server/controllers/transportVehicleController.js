import mongoose from 'mongoose';
import Asset from '../models/propertyAsset.js';

const vehiclePattern = /\b(vehicle|transport|buses?|pickup|sedan|cars?|vans?|trucks?)\b/i;
const vehicleMatchPattern = '\\b(vehicle|transport|buses?|pickup|sedan|cars?|vans?|trucks?)\\b';
const vehicleQuery = {
  $or: [
    { assetName: { $regex: vehicleMatchPattern, $options: 'i' } },
    { assetType: { $regex: vehicleMatchPattern, $options: 'i' } },
    { category: { $regex: vehicleMatchPattern, $options: 'i' } },
    { vehicleNumber: { $regex: vehicleMatchPattern, $options: 'i' } },
    { plateNumber: { $regex: vehicleMatchPattern, $options: 'i' } },
  ],
};

const isTransportOfficer = (user) => {
  const role = String(user?.role || '').trim().toLowerCase();
  return role.includes('transport') && role.includes('officer');
};

const rejectNonTransportOfficer = (req, res) => {
  if (isTransportOfficer(req.user)) return false;
  res.status(403).json({ success: false, message: 'Transport Officer access is required.' });
  return true;
};

const normalizeVehicleStatus = (record) => {
  const status = String(record.status || '').trim().toLowerCase();
  if (status === 'returned') return 'Returned';
  if (['available', 'unassigned', 'not assigned'].includes(status)) return 'Available';
  if (['damaged', 'under maintenance', 'maintenance', 'repair'].includes(status)) return 'Under Maintenance';
  if (['assigned', 'in use', 'outstanding', 'unreturned', 'overdue'].includes(status)) return 'Assigned';
  if (status === 'lost') return 'Lost';
  return record.employeeId && record.employeeId !== 'N/A' ? 'Assigned' : 'Available';
};

const mapAssignmentHistory = (record) => {
  if (Array.isArray(record.assignmentHistory) && record.assignmentHistory.length) {
    return record.assignmentHistory.map((entry) => ({
      employeeName: entry.employeeName || 'N/A',
      employeeId: entry.employeeId || 'N/A',
      department: entry.department || 'N/A',
      assignedDate: entry.assignedDate || null,
      returnedDate: entry.returnedDate || null,
      status: entry.status || 'Recorded',
      remarks: entry.remarks || '',
    }));
  }

  return (Array.isArray(record.history) ? record.history : []).map((entry) => ({
    employeeName: entry.employeeName || 'N/A',
    employeeId: entry.employeeId || 'N/A',
    department: entry.department || 'N/A',
    assignedDate: entry.assignedDate || entry.date || null,
    returnedDate: entry.returnedDate || null,
    status: entry.status || 'Recorded',
    remarks: entry.remarks || entry.action || '',
  }));
};

const mapVehicleRecord = (record) => {
  const vehicleNumber = record.vehicleNumber || record.plateNumber || record.assetId || 'N/A';
  const vehicleType = [record.vehicleType, record.assetType, record.category, record.assetName]
    .find((value) => vehiclePattern.test(String(value || '')))
    || record.vehicleType
    || record.assetType
    || record.category
    || record.assetName
    || 'Vehicle';

  return {
    id: String(record._id),
    vehicleNumber,
    plateNumber: record.plateNumber || record.vehicleNumber || record.assetId || 'N/A',
    vehicleType,
    make: record.make || '',
    model: record.model || '',
    makeModel: [record.make, record.model].filter(Boolean).join(' ') || 'N/A',
    employeeName: record.employeeName || 'N/A',
    employeeId: record.employeeId || 'N/A',
    department: record.department || 'N/A',
    assignedDate: record.assignedDate || null,
    returnDate: record.returnDate || null,
    status: normalizeVehicleStatus(record),
    remarks: record.remarks || '',
    condition: record.condition || 'N/A',
    assignmentHistory: mapAssignmentHistory(record),
  };
};

const getVehicleRecords = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;

  try {
    const { search = '', department = 'All', status = 'All', vehicleType = 'All' } = req.query;
    const records = await Asset.find(vehicleQuery).sort({ updatedAt: -1, assignedDate: -1 }).lean();
    const mapped = records.map(mapVehicleRecord);
    const searchTerm = String(search).trim().toLowerCase();

    const filteredRecords = mapped.filter((vehicle) => {
      const matchesSearch = !searchTerm || [
        vehicle.vehicleNumber,
        vehicle.plateNumber,
        vehicle.vehicleType,
        vehicle.makeModel,
        vehicle.employeeName,
        vehicle.employeeId,
      ].some((value) => String(value || '').toLowerCase().includes(searchTerm));
      const matchesDepartment = department === 'All' || vehicle.department === department;
      const matchesStatus = status === 'All' || vehicle.status === status;
      const matchesVehicleType = vehicleType === 'All' || vehicle.vehicleType === vehicleType;
      return matchesSearch && matchesDepartment && matchesStatus && matchesVehicleType;
    });

    return res.status(200).json({
      success: true,
      total: filteredRecords.length,
      records: filteredRecords,
      filters: {
        departments: [...new Set(mapped.map((vehicle) => vehicle.department).filter((value) => value && value !== 'N/A'))].sort(),
        vehicleTypes: [...new Set(mapped.map((vehicle) => vehicle.vehicleType).filter(Boolean))].sort(),
        statuses: [...new Set(mapped.map((vehicle) => vehicle.status).filter(Boolean))].sort(),
      },
    });
  } catch (error) {
    console.error('Error fetching Transport assigned vehicles:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load assigned vehicle records.' });
  }
};

const getVehicleRecordById = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;

  try {
    const { vehicleId } = req.params;
    const identifiers = [{ assetId: vehicleId }, { vehicleNumber: vehicleId }, { plateNumber: vehicleId }];
    if (mongoose.isValidObjectId(vehicleId)) identifiers.push({ _id: vehicleId });
    const record = await Asset.findOne({ $and: [vehicleQuery, { $or: identifiers }] }).lean();
    if (!record) return res.status(404).json({ success: false, message: 'Assigned vehicle record not found.' });

    return res.status(200).json({ success: true, vehicle: mapVehicleRecord(record) });
  } catch (error) {
    console.error('Error fetching assigned vehicle details:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load vehicle details.' });
  }
};

export { getVehicleRecords, getVehicleRecordById };