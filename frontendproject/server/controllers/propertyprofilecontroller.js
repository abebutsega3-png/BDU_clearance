const User = require('../models/User');
const Employee = require('../models/propertyprofile');

// GET /api/users/me -> Retrieve full profile for logged-in user
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from Auth Middleware

    // Fetch user account info and populate referenced Employee record
    const userAccount = await User.findById(userId)
      .select('-password')
      .populate('employeeId');

    if (!userAccount || !userAccount.employeeId) {
      return res.status(404).json({ success: false, message: 'Profile record not found' });
    }

    const employee = userAccount.employeeId;

    // Structure response separating Editable and Read-Only domains
    const profileData = {
      account: {
        role: userAccount.role,
        accountStatus: userAccount.accountStatus,
        lastLogin: userAccount.lastLogin,
        username: userAccount.email
      },
      personal: {
        fullName: employee.fullName,
        employeeId: employee.employeeId,
        gender: employee.gender,
        dateOfBirth: employee.dateOfBirth,
        phone: employee.phone,
        alternativePhone: employee.alternativePhone,
        email: employee.email,
        profilePhoto: employee.profilePhoto
      },
      employment: {
        department: employee.department,
        position: employee.position,
        employmentType: employee.employmentType,
        employmentDate: employee.employmentDate,
        status: employee.status,
        campus: employee.campus
      },
      documents: employee.documents
    };

    return res.status(200).json({ success: true, data: profileData });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving profile', error: error.message });
  }
};

// PUT /api/users/me -> Update only permitted contact details & profile photo
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, alternativePhone, email, profilePhoto } = req.body;

    const userAccount = await User.findById(userId);
    if (!userAccount) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Strict field filtering: Only update contact & photo
    const updateFields = {};
    if (phone !== undefined) updateFields.phone = phone;
    if (alternativePhone !== undefined) updateFields.alternativePhone = alternativePhone;
    if (email !== undefined) {
      updateFields.email = email;
      userAccount.email = email; // Keep User.email in sync
      await userAccount.save();
    }
    if (profilePhoto !== undefined) updateFields.profilePhoto = profilePhoto;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      userAccount.employeeId,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedEmployee
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
  }
};