import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    notifications: [
      {
        id: 'lib-note-1',
        title: 'Review library clearance request',
        message: 'Aster Bekele has a pending material return review.',
        createdAt: new Date().toISOString(),
        read: false,
      },
    ],
  });
});

router.patch('/:id/read', (req, res) => {
  res.status(200).json({
    success: true,
    id: req.params.id,
    read: true,
  });
});

export default router;
