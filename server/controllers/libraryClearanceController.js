const LibraryClearance = require('../models/LibraryClearance');

// 1. Get Clearance Request Details by ID
exports.getClearanceDetails = async (req, res) => {
  try {
    const clearance = await LibraryClearance.findById(req.params.id);
    if (!clearance) {
      return res.status(404).json({ message: 'Clearance Request Not Found' });
    }
    res.status(200).json(clearance);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// 2. Start Review (Pending -> Under Review)
exports.startReview = async (req, res) => {
  try {
    const clearance = await LibraryClearance.findByIdAndUpdate(
      req.params.id,
      { status: 'Under Review' },
      { returnDocument: 'after' }
    );
    res.status(200).json(clearance);
  } catch (error) {
    res.status(500).json({ message: 'Error starting review', error: error.message });
  }
};

// 3. Approve Clearance (Under Review -> Approved)
exports.approveClearance = async (req, res) => {
  try {
    const { comment } = req.body;
    const clearance = await LibraryClearance.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Approved',
        verificationResult: 'Clear',
        comment: comment || 'No outstanding library obligations.'
      },
      { returnDocument: 'after' }
    );
    res.status(200).json(clearance);
  } catch (error) {
    res.status(500).json({ message: 'Error approving clearance', error: error.message });
  }
};

// 4. Return Request (Under Review -> Returned)
exports.returnClearance = async (req, res) => {
  try {
    const { returnReason, affectedField = '' } = req.body;
    if (!returnReason) {
      return res.status(400).json({ message: 'Return reason is required' });
    }

    const clearance = await LibraryClearance.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Returned',
        verificationResult: 'Not Clear',
        returnReason,
        returnedBy: req.user?.fullName || req.user?.name || 'Library Officer',
        returnedOffice: 'Library Office',
        returnedAt: new Date(),
        returnedReason: returnReason,
        returnedRemark: req.body.comment || req.body.remarks || returnReason,
        affectedField: affectedField || 'Library Clearance'
      },
      { returnDocument: 'after' }
    );
    res.status(200).json(clearance);
  } catch (error) {
    res.status(500).json({ message: 'Error returning clearance', error: error.message });
  }
};