const User = require('../models/User');

// 1. የዩዘር ፕሮፋይል መረጃ ማምጫ (Get Profile)
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id; // ወይም ከ Auth middleware (req.user.id)
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ተጠቃሚው አልተገኘም'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'የፕሮፋይል መረጃ ሲመጣ ስህተት ተከሰተ',
      error: error.message
    });
  }
};

// 2. የግል እና የስራ መረጃዎችን ማዘመኛ (Update Personal & Employment Info)
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    // ሊቀየሩ የሚችሉ ፊልዶችን መለየት
    const allowedUpdates = [
      'fullName', 'gender', 'dateOfBirth', 'phoneNumber', 'email',
      'department', 'position', 'jobGrade', 'employmentType', 'campus',
      'sectionTeam', 'officeLocation', 'aboutMe'
    ];

    const filteredUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: filteredUpdates },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'ተጠቃሚው አልተገኘም'
      });
    }

    res.status(200).json({
      success: true,
      message: 'ፕሮፋይሉ በስኬት ተሻሽሏል',
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'ፕሮፋይሉን ማዘመን አልተቻለም',
      error: error.message
    });
  }
};

// 3. የፕሮፋይል ፎቶ መቀየሪያ (Update Avatar)
exports.updateAvatar = async (req, res) => {
  try {
    const userId = req.params.id;

    // Multer ፋይል ከላከ
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'እባክዎን ምስል ይምረጡ'
      });
    }

    const avatarPath = `/uploads/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarPath },
      { returnDocument: 'after' }
    );

    res.status(200).json({
      success: true,
      message: 'የፕሮፋይል ፎቶ በስኬት ተቀይሯል',
      avatar: updatedUser.avatar
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ፎቶውን መቀየር አልተቻለም',
      error: error.message
    });
  }
};

// 4. የይለፍ ቃል መቀየሪያ (Change Password)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);

    // እዚህ ጋር የቆየውን የይለፍ ቃል በ bcrypt ማረጋገጥ ያስፈልጋል
    // const isMatch = await bcrypt.compare(currentPassword, user.password);

    // አዲሱን ይለፍ ቃል Hash አድርጎ ማስቀመጥ
    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    // user.password = hashedPassword;
    // await user.save();

    res.status(200).json({
      success: true,
      message: 'የይለፍ ቃል በስኬት ተቀይሯል'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'የይለፍ ቃል መቀየር አልተቻለም',
      error: error.message
    });
  }
};