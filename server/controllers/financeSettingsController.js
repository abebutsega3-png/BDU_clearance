import FinanceSettings from "../models/FinanceSettings.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

export const getFinanceSettings = async (req, res) => {
  try {
    let settings = await FinanceSettings.findOne({ user: req.user._id });

    if (!settings) {
      settings = await FinanceSettings.create({ user: req.user._id });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ቅንብሮችን መጫን አልተቻለም",
      error: error.message,
    });
  }
};

export const updateFinanceSettings = async (req, res) => {
  try {
    let settings = await FinanceSettings.findOne({ user: req.user._id });

    if (!settings) {
      settings = new FinanceSettings({ user: req.user._id });
    }

    const {
      clearanceRules,
      obligationRules,
      notifications,
      reminders,
      reports,
      security,
    } = req.body;

    if (clearanceRules) settings.clearanceRules = clearanceRules;
    if (obligationRules) settings.obligationRules = obligationRules;
    if (notifications) settings.notifications = notifications;
    if (reminders) settings.reminders = reminders;
    if (reports) settings.reports = reports;
    if (security) settings.security = security;

    await settings.save();

    res.status(200).json({
      success: true,
      message: "የፋይናንስ ቅንብሮች በጥሩ ሁኔታ ተዘምነዋል",
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ቅንብሮችን ማዘመን አልተቻለም",
      error: error.message,
    });
  }
};

export const changeSettingsPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "እባክዎን የቆየውን እና አዲሱን የይለፍ ቃል ያስገቡ",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "ተጠቃሚው አልተገኘም" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "የገባው የቆየ የይለፍ ቃል ትክክል አይደለም",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "የይለፍ ቃልዎ በጥሩ ሁኔታ ተቀይሯል",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "የይለፍ ቃል መቀየር አልተቻለም",
      error: error.message,
    });
  }
};