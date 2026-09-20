import LibraryClearance from '../models/LibraryClearance.js';

const normalizeStatus = (clearance) => {
  if (clearance.status === 'Approved' || clearance.status === 'Completed') return 'Returned';
  if (clearance.status === 'Returned') return 'Overdue';
  if (clearance.borrowedItemsStatus === 'Not Clear' || Number(clearance.outstandingFineAmount || 0) > 0) return 'Outstanding';
  return 'Borrowed';
};

const matchesSearch = (record, search) => {
  if (!search) return true;
  const value = `${record.employeeName} ${record.employeeId} ${record.requestId} ${record.department}`.toLowerCase();
  return value.includes(search.toLowerCase());
};

export const getLibraryRecords = async (req, res) => {
  try {
    const { search = '', department = 'All', campus = 'All', status = 'All', employeeId = '' } = req.query;
    const query = {};
    if (department !== 'All') query.department = department;
    if (employeeId) query.employeeId = employeeId;

    const records = await LibraryClearance.find(query).sort({ submittedDate: -1, createdAt: -1 }).lean();
    const enriched = records.map((record) => ({
      ...record,
      recordStatus: normalizeStatus(record),
      dueDate: record.dueDate || null,
      campus: record.campus || 'N/A',
    })).filter((record) => (
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