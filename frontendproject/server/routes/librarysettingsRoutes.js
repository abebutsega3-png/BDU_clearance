import express from 'express';

const router = express.Router();

router.get('/:userId', (req, res) => {
  res.status(200).json({
    success: true,
    userId: req.params.userId,
    settings: {
      language: 'English',
      notificationPreferences: {
        newClearanceRequest: true,
        returnedResubmitted: true,
        clearanceStatusUpdate: true,
        reportRequest: true,
      },
      displayPreferences: {
        itemsPerPage: 10,
        defaultRequestFilter: 'Pending',
      },
    },
  });
});

router.put('/:userId', (req, res) => {
  res.status(200).json({
    success: true,
    userId: req.params.userId,
    message: 'Library settings updated successfully.',
    settings: req.body,
  });
});

export default router;
