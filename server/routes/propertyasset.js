import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Asset route is available',
      assets: []
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assets', error: error.message });
  }
});

export default router;
