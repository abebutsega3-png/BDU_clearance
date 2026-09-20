import Asset from '../models/propertyAsset.js';

const normalizeStatus = (status) => {
  const value = (status || '').toString().trim();
  if (!value) return 'Outstanding';

  const lower = value.toLowerCase();
  if (lower === 'returned') return 'Returned';
  if (lower === 'assigned' || lower === 'in use') return 'Assigned';
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
  employeeName: record.employeeName || 'Unknown Employee',
  employeeId: record.employeeId || 'N/A',
  department: record.department || 'N/A',
  assetType: record.assetType || record.category || 'General Equipment',
  category: record.category || record.assetType || 'General Equipment',
  campus: record.campus || 'Main Campus',
  assignedDate: record.assignedDate || record.createdAt || null,
  returnDate: record.returnDate || null,
  status: normalizeStatus(record.status),
  condition: record.condition || 'Good',
  history: Array.isArray(record.history)
    ? record.history.map((item) => ({
        date: formatDate(item.date || item.createdAt),
        action: item.action || item.note || 'Updated'
      }))
    : []
});

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

    const uniqueAssetTypes = [...new Set(records.map((item) => item.assetType || item.category || 'General Equipment').filter(Boolean))];
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
