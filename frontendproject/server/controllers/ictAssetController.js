import ICTAsset from '../models/ICTAsset.js';

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
    const { assetId, serialNumber, assetType, brand, model, condition, purchaseDate, campus, location, performedBy } = req.body;

    const existingAsset = await ICTAsset.findOne({
      $or: [{ assetId: assetId.toUpperCase() }, { serialNumber }]
    });

    if (existingAsset) {
      return res.status(400).json({ success: false, message: 'Asset ID or Serial Number already exists.' });
    }

    const newAsset = new ICTAsset({
      assetId: assetId.toUpperCase(),
      serialNumber,
      assetType,
      brand,
      model,
      condition: condition || 'Good',
      purchaseDate,
      campus,
      location: location || 'ICT Office',
      assetStatus: 'Available',
      history: [{
        action: 'REGISTERED',
        condition: condition || 'Good',
        performedBy: performedBy || 'ICT Officer',
        notes: 'Initial registration into ICT inventory.'
      }]
    });

    await newAsset.save();
    res.status(201).json({ success: true, data: newAsset });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const assignAsset = async (req, res) => {
  try {
    const { assetId, employeeId, employeeName, department, campus, conditionAtAssignment, assignedBy, remarks } = req.body;

    const asset = await ICTAsset.findOne({ assetId: assetId.toUpperCase() });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    if (asset.assetStatus === 'Assigned') {
      return res.status(400).json({ success: false, message: 'Asset is already assigned.' });
    }

    asset.assetStatus = 'Assigned';
    asset.currentAssignment = {
      employeeId,
      employeeName,
      department,
      campus: campus || asset.campus,
      assignedDate: new Date(),
      conditionAtAssignment: conditionAtAssignment || 'Good',
      assignedBy: assignedBy || 'ICT Officer',
      remarks
    };

    asset.history.push({
      action: 'ASSIGNED',
      employeeId,
      employeeName,
      department,
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