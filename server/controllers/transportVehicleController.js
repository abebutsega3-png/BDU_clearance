import mongoose from 'mongoose';
import Employee from '../models/employee.js';
import Asset from '../models/propertyAsset.js';
import Department from '../models/department.js';

const vehiclePattern = /\b(vehicle|transport|buses?|pick[- ]?up|sedan|suvs?|cars?|vans?|trucks?)\b/i;
const vehicleMatchPattern = '\\b(vehicle|transport|buses?|pick[- ]?up|sedan|suvs?|cars?|vans?|trucks?)\\b';
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

const createVehicleRecord = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;

  try {
    const {
      vehicleNumber,
      vehicleType,
      make,
      model,
      manufacturingYear,
      color = '',
      seatingCapacity,
      currentMileage,
      chassisNumber = '',
      engineNumber = '',
      department = '',
      status,
      condition,
      employeeId = '',
      assignmentDate,
      returnDate,
      purchaseValue,
      registrationDate,
      registrationExpiryDate,
      insuranceExpiryDate,
      lastMaintenanceDate,
      nextMaintenanceDate,
      remarks = '',
    } = req.body || {};
    const cleanVehicleNumber = String(vehicleNumber || '').trim().toUpperCase();
    const cleanVehicleType = String(vehicleType || '').trim();
    const cleanMake = String(make || '').trim();
    const cleanModel = String(model || '').trim();
    const cleanColor = String(color || '').trim();
    const cleanChassisNumber = String(chassisNumber || '').trim().toUpperCase();
    const cleanEngineNumber = String(engineNumber || '').trim().toUpperCase();
    const cleanDepartment = String(department || '').trim();
    const cleanEmployeeId = String(employeeId || '').trim();
    const cleanRemarks = String(remarks || '').trim();
    const allowedVehicleTypes = ['Bus', 'Minibus', 'Sedan', 'SUV', 'Pick-up', 'Pickup', 'Van', 'Truck', 'Motorcycle', 'Other Vehicle'];
    const allowedStatuses = ['Assigned', 'Available', 'Under Maintenance', 'Lost'];
    const allowedConditions = ['New', 'Good', 'Fair', 'Damaged'];
    const isValidDate = (value) => {
      if (!value) return true;
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    };
    const today = new Date().toISOString().slice(0, 10);

    if (!/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(cleanVehicleNumber)) {
      return res.status(400).json({ success: false, message: 'Plate number must be 2–30 letters, numbers, or hyphens only.' });
    }
    if (!allowedVehicleTypes.includes(cleanVehicleType)) {
      return res.status(400).json({ success: false, message: 'Select a valid vehicle type.' });
    }
    if (!/[\p{L}]/u.test(cleanMake)) {
      return res.status(400).json({ success: false, message: 'Make / Brand is required and cannot contain numbers only.' });
    }
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Select a valid vehicle status.' });
    }
    if (!allowedConditions.includes(condition)) {
      return res.status(400).json({ success: false, message: 'Select a valid vehicle condition.' });
    }
    const purchaseValueText = typeof purchaseValue === 'number' ? String(purchaseValue) : purchaseValue;
    if (typeof purchaseValueText !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(purchaseValueText)) {
      return res.status(400).json({ success: false, message: 'Purchase value must contain digits only, with up to two decimal places.' });
    }
    const cleanPurchaseValue = Number(purchaseValueText);
    if (!Number.isFinite(cleanPurchaseValue) || cleanPurchaseValue <= 0) {
      return res.status(400).json({ success: false, message: 'Purchase value must be a positive amount in ETB.' });
    }
    if (!cleanChassisNumber) {
      return res.status(400).json({ success: false, message: 'Chassis / serial number is required.' });
    }
    if (status === 'Assigned' && !cleanEmployeeId) {
      return res.status(400).json({ success: false, message: 'Select an active employee before assigning the vehicle.' });
    }
    if (status !== 'Assigned' && cleanEmployeeId) {
      return res.status(400).json({ success: false, message: 'An employee can only be selected when vehicle status is Assigned.' });
    }
    const year = manufacturingYear === '' || manufacturingYear === undefined ? null : Number(manufacturingYear);
    const seats = seatingCapacity === '' || seatingCapacity === undefined ? null : Number(seatingCapacity);
    const mileage = currentMileage === '' || currentMileage === undefined ? null : Number(currentMileage);
    const currentYear = new Date().getFullYear();
    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > currentYear)) {
      return res.status(400).json({ success: false, message: `Manufacturing year must be between 1900 and ${currentYear}.` });
    }
    if (seats !== null && (!Number.isInteger(seats) || seats < 1)) {
      return res.status(400).json({ success: false, message: 'Seating capacity must be a positive whole number.' });
    }
    if (mileage !== null && (!Number.isFinite(mileage) || mileage < 0)) {
      return res.status(400).json({ success: false, message: 'Current mileage must be a non-negative number.' });
    }
    const dates = { registrationDate, registrationExpiryDate, insuranceExpiryDate, lastMaintenanceDate, nextMaintenanceDate, assignmentDate, returnDate };
    if (!Object.values(dates).every(isValidDate)) {
      return res.status(400).json({ success: false, message: 'Enter valid calendar dates for the vehicle records.' });
    }
    if (registrationDate && registrationDate > today) {
      return res.status(400).json({ success: false, message: 'Registration date cannot be in the future.' });
    }
    if (registrationDate && registrationExpiryDate && registrationExpiryDate <= registrationDate) {
      return res.status(400).json({ success: false, message: 'Registration expiry date must be after the registration date.' });
    }
    if (lastMaintenanceDate && lastMaintenanceDate > today) {
      return res.status(400).json({ success: false, message: 'Last maintenance date cannot be in the future.' });
    }
    if (nextMaintenanceDate && nextMaintenanceDate < today) {
      return res.status(400).json({ success: false, message: 'Next maintenance date must be today or in the future.' });
    }
    if (lastMaintenanceDate && nextMaintenanceDate && nextMaintenanceDate <= lastMaintenanceDate) {
      return res.status(400).json({ success: false, message: 'Next maintenance date must be after the last maintenance date.' });
    }
    if (assignmentDate && assignmentDate > today) {
      return res.status(400).json({ success: false, message: 'Assignment date cannot be in the future.' });
    }
    if (returnDate && (!assignmentDate || returnDate <= assignmentDate)) {
      return res.status(400).json({ success: false, message: 'Return / renewal due date must be after the assignment date.' });
    }
    if (cleanColor.length > 40 || cleanChassisNumber.length > 40 || cleanEngineNumber.length > 40 || cleanRemarks.length > 1000) {
      return res.status(400).json({ success: false, message: 'Color, chassis, engine, or remarks exceed the allowed length.' });
    }
    const employeeRecord = cleanEmployeeId
      ? await Employee.findOne({ employeeId: cleanEmployeeId, status: 'Active' })
        .select('employeeId fullName department')
        .lean()
      : null;
    if (cleanEmployeeId && !employeeRecord) {
      return res.status(400).json({ success: false, message: 'Select an active employee from the search results.' });
    }
    let departmentName = employeeRecord?.department || 'N/A';
    if (cleanDepartment && !employeeRecord) {
      const escapedDepartment = cleanDepartment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const departmentRecord = await Department.findOne({
        departmentName: { $regex: `^${escapedDepartment}$`, $options: 'i' },
        status: 'Active',
      }).select('departmentName').lean();
      if (!departmentRecord) {
        return res.status(400).json({ success: false, message: 'Select an active university department.' });
      }
      departmentName = departmentRecord.departmentName;
    }

    const escapedNumber = cleanVehicleNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingVehicle = await Asset.findOne({
      $or: [
        { vehicleNumber: new RegExp(`^${escapedNumber}$`, 'i') },
        { plateNumber: new RegExp(`^${escapedNumber}$`, 'i') },
        { assetId: new RegExp(`^${escapedNumber}$`, 'i') },
      ],
    }).select('_id');
    if (existingVehicle) {
      return res.status(409).json({ success: false, message: 'A vehicle record with this vehicle number already exists.' });
    }
    if (cleanChassisNumber) {
      const escapedChassisNumber = cleanChassisNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingChassis = await Asset.exists({
        $or: [
          { chassisNumber: new RegExp(`^${escapedChassisNumber}$`, 'i') },
          { serialNumber: new RegExp(`^${escapedChassisNumber}$`, 'i') },
        ],
      });
      if (existingChassis) {
        return res.status(409).json({ success: false, message: 'A vehicle with this chassis / serial number already exists.' });
      }
    }

    const assetId = `TR-${cleanVehicleNumber.replace(/\s+/g, '-')}`;
    const existingAssetId = await Asset.findOne({ assetId: new RegExp(`^${assetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('_id');
    if (existingAssetId) {
      return res.status(409).json({ success: false, message: 'A record with the generated vehicle asset ID already exists.' });
    }

    const vehicle = await Asset.create({
      assetId,
      assetName: `${cleanVehicleType} Vehicle ${cleanVehicleNumber}`,
      vehicleNumber: cleanVehicleNumber,
      plateNumber: cleanVehicleNumber,
      serialNumber: cleanChassisNumber,
      make: cleanMake,
      model: cleanModel,
      manufacturingYear: year,
      color: cleanColor,
      seatingCapacity: seats,
      currentMileage: mileage,
      chassisNumber: cleanChassisNumber,
      engineNumber: cleanEngineNumber,
      purchaseValue: cleanPurchaseValue,
      registrationDate: registrationDate || null,
      registrationExpiryDate: registrationExpiryDate || null,
      insuranceExpiryDate: insuranceExpiryDate || null,
      lastMaintenanceDate: lastMaintenanceDate || null,
      nextMaintenanceDate: nextMaintenanceDate || null,
      assetType: cleanVehicleType,
      category: cleanVehicleType,
      location: '',
      employeeName: employeeRecord?.fullName || 'Unassigned',
      employeeId: employeeRecord?.employeeId || 'N/A',
      department: departmentName,
      status,
      condition,
      assignedDate: assignmentDate ? new Date(`${assignmentDate}T00:00:00.000Z`) : null,
      returnDate: returnDate ? new Date(`${returnDate}T00:00:00.000Z`) : null,
      remarks: cleanRemarks,
      assignmentHistory: employeeRecord ? [{
        employeeName: employeeRecord.fullName,
        employeeId: employeeRecord.employeeId,
        department: employeeRecord.department,
        assignedDate: assignmentDate ? new Date(`${assignmentDate}T00:00:00.000Z`) : null,
        returnedDate: returnDate ? new Date(`${returnDate}T00:00:00.000Z`) : null,
        status,
        remarks: cleanRemarks,
      }] : [],
    });

    return res.status(201).json({ success: true, vehicle: mapVehicleRecord(vehicle.toObject()) });
  } catch (error) {
    console.error('Error creating Transport vehicle record:', error.message);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A vehicle record with this identifier already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Unable to add the vehicle record.' });
  }
};

const searchAssignableEmployees = async (req, res) => {
  if (rejectNonTransportOfficer(req, res)) return;
  const searchTerm = String(req.query.search || '').trim();
  if (!searchTerm) return res.status(200).json({ success: true, employees: [] });
  if (searchTerm.length > 100) {
    return res.status(400).json({ success: false, message: 'Employee search must be 100 characters or fewer.' });
  }

  try {
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(escapedTerm, 'i');
    const employees = await Employee.find({
      status: 'Active',
      $or: [{ employeeId: matcher }, { fullName: matcher }],
    })
      .select('employeeId fullName department')
      .sort({ employeeId: 1 })
      .limit(8)
      .maxTimeMS(10000)
      .lean();
    return res.status(200).json({ success: true, employees });
  } catch (error) {
    console.error('Error searching active employees for Transport vehicle assignment:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to search active employees.' });
  }
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
    manufacturingYear: record.manufacturingYear || null,
    color: record.color || '',
    seatingCapacity: record.seatingCapacity ?? null,
    currentMileage: record.currentMileage ?? null,
    chassisNumber: record.chassisNumber || '',
    engineNumber: record.engineNumber || '',
    purchaseValue: record.purchaseValue ?? 0,
    registrationDate: record.registrationDate || null,
    registrationExpiryDate: record.registrationExpiryDate || null,
    insuranceExpiryDate: record.insuranceExpiryDate || null,
    lastMaintenanceDate: record.lastMaintenanceDate || null,
    nextMaintenanceDate: record.nextMaintenanceDate || null,
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

export { createVehicleRecord, getVehicleRecords, getVehicleRecordById, searchAssignableEmployees };