const express = require('express');
const router = express.Router();
const controller = require('../controllers/libraryClearanceController');

router.get('/:id', controller.getClearanceDetails);
router.patch('/:id/start-review', controller.startReview);
router.patch('/:id/approve', controller.approveClearance);
router.patch('/:id/return', controller.returnClearance);

module.exports = router;