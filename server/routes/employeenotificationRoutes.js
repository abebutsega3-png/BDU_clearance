const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// GET: ሁሉንም ማስታወቂያዎች ማምጣት
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH: ነጠላ ማስታወቂያን "Read" ማድረግ
router.patch('/:id/read', async (req, res) => {
  try {
    const updatedNotification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'Read' },
      { returnDocument: 'after' }
    );
    res.status(200).json(updatedNotification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH: ሁሉንም ማስታወቂያዎች በአንድ ላይ "Read" ማድረግ
router.patch('/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany({ status: 'Unread' }, { status: 'Read' });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;