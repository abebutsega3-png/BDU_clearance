import express from 'express';

const router = express.Router();

const sampleRecords = [
  {
    _id: 'LM-1001',
    requestId: 'BDU-223',
    employeeName: 'Aster Bekele',
    employeeId: 'BDU_223',
    department: 'Information Technology',
    campus: 'Main Campus',
    materialType: 'Book',
    title: 'Database Systems',
    accessionNumber: '179119098192',
    borrowedDate: '2026-10-05',
    dueDate: '2026-10-19',
    currentCondition: 'Good',
    fineAmount: 0,
    status: 'Borrowed',
  },
  {
    _id: 'LM-1002',
    requestId: 'BDU-224',
    employeeName: 'Mihret Mamo',
    employeeId: 'BDU_224',
    department: 'Engineering',
    campus: 'Main Campus',
    materialType: 'Laptop',
    title: 'Engineering Lab Kit',
    accessionNumber: '179119098193',
    borrowedDate: '2026-09-12',
    dueDate: '2026-09-26',
    currentCondition: 'Damaged',
    fineAmount: 1500,
    status: 'Outstanding',
  },
  {
    _id: 'LM-1003',
    requestId: 'BDU-225',
    employeeName: 'Selam Hailu',
    employeeId: 'BDU_225',
    department: 'Business',
    campus: 'Main Campus',
    materialType: 'Journal',
    title: 'Business Strategy Review',
    accessionNumber: '179119098194',
    borrowedDate: '2026-08-11',
    dueDate: '2026-08-25',
    currentCondition: 'Fair',
    fineAmount: 300,
    status: 'Overdue',
  },
  {
    _id: 'LM-1004',
    requestId: 'BDU-226',
    employeeName: 'Daniel Tadesse',
    employeeId: 'BDU_226',
    department: 'Education',
    campus: 'North Campus',
    materialType: 'Book',
    title: 'Teaching Methods',
    accessionNumber: '179119098195',
    borrowedDate: '2026-10-02',
    dueDate: '2026-10-16',
    currentCondition: 'Good',
    fineAmount: 0,
    status: 'Returned',
  },
];

const normalizeStatus = (record) => {
  if (record.status === 'Approved' || record.status === 'Completed') return 'Returned';
  if (record.status === 'Returned') return 'Returned';
  if (record.status === 'Outstanding' || record.status === 'Overdue') return record.status;
  return record.status || 'Borrowed';
};

router.get('/', (req, res) => {
  const records = sampleRecords.map((record) => ({
    ...record,
    recordStatus: normalizeStatus(record),
  }));

  res.status(200).json({
    success: true,
    records,
    summary: {
      borrowed: records.filter((record) => record.recordStatus === 'Borrowed').length,
      outstanding: records.filter((record) => record.recordStatus === 'Outstanding').length,
      overdue: records.filter((record) => record.recordStatus === 'Overdue').length,
      returned: records.filter((record) => record.recordStatus === 'Returned').length,
    },
    departments: [...new Set(records.map((record) => record.department).filter(Boolean))],
    campuses: [...new Set(records.map((record) => record.campus).filter(Boolean))],
  });
});

export default router;
