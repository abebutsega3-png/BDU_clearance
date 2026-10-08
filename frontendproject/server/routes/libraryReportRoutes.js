import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    report: {
      totalRecords: 4,
      borrowed: 1,
      outstanding: 1,
      overdue: 1,
      returned: 1,
      generatedAt: new Date().toISOString(),
    },
  });
});

export default router;
