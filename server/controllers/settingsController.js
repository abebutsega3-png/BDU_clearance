const SystemSettings = require('../models/SystemSettings');

// 1. ሁሉንም የሲስተም ሴቲንግ መረጃዎች ማምጫ (Get All System Settings)
exports.getSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    
    // በዳታቤዝ ውስጥ መረጃ ከሌለ አዲስ Default Config ይፈጥራል
    if (!settings) {
      settings = await SystemSettings.create({});
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'የሲስተም ማስተካከያዎችን ማምጣት አልተቻለም',
      error: error.message
    });
  }
};

// 2. የተወሰነ ክፍለ-ሴቲንግን ለማዘመን (Update Specific Settings Section)
exports.updateSettingsSection = async (req, res) => {
  try {
    const { section } = req.params; // ምሳሌ: 'general', 'usersAndAccounts', 'notifications', 'security'
    const updateData = req.body;

    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
    }

    // የጠየቀው Section በ Schema ውስጥ መኖሩን ማረጋገጥ
    if (!settings[section]) {
      return res.status(400).json({
        success: false,
        message: 'የተሳሳተ የሴቲንግ ክፍል ተመርጧል'
      });
    }

    // መረጃውን ማዘመን (Nested Merge)
    settings[section] = {
      ...settings[section].toObject(),
      ...updateData
    };

    await settings.save();

    res.status(200).json({
      success: true,
      message: `${section} settings successfully updated`,
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ማስተካከያውን ማስቀመጥ አልተቻለም',
      error: error.message
    });
  }
};

// 3. የ Maintenance Modeን ብቻ ለመቀየር (Toggle Maintenance Mode)
exports.toggleMaintenanceMode = async (req, res) => {
  try {
    const { maintenanceMode } = req.body;

    let settings = await SystemSettings.findOne();
    if (!settings) settings = new SystemSettings();

    settings.backupAndMaintenance.maintenanceMode = maintenanceMode;
    await settings.save();

    res.status(200).json({
      success: true,
      message: `Maintenance Mode ${maintenanceMode ? 'Enabled' : 'Disabled'}`,
      maintenanceMode: settings.backupAndMaintenance.maintenanceMode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'የ Maintenance Mode መቀየር አልተቻለም',
      error: error.message
    });
  }
};