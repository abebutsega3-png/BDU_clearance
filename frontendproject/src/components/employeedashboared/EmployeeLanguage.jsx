import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/authContext';

const EmployeeLanguageContext = createContext(null);
const LANGUAGE_KEY = 'employeeNavbarLanguage';

const translations = {
  'Welcome': 'እንኳን ደህና መጡ',
  'Open menu': 'ምናሌውን ክፈት',
  'Language': 'ቋንቋ',
  'Notifications': 'ማሳወቂያዎች',
  'unread notifications': 'ያልተነበቡ ማሳወቂያዎች',
  'Open account menu': 'የመለያ ምናሌን ክፈት',
  'Current Role': 'አሁን ያለው ሚና',
  'Switch Role': 'ሚና ቀይር',
  'Choose your preferred dashboard': 'የሚፈልጉትን ዳሽቦርድ ይምረጡ',
  'Employee Dashboard': 'የሰራተኛ ዳሽቦርድ',
  'Department Head Dashboard': 'የዲፓርትመንት ኃላፊ ዳሽቦርድ',
  'My Clearance · My Profile · My Assets': 'የእኔ ክሊራንስ · የእኔ መገለጫ · ንብረቶቼ',
  'Review Requests · Approvals · Reports': 'ጥያቄዎችን ይገምግሙ · ማጽደቂያዎች · ሪፖርቶች',
  'Open Employee Dashboard': 'የሰራተኛ ዳሽቦርድን ክፈት',
  'Open Department Head Dashboard': 'የዲፓርትመንት ኃላፊ ዳሽቦርድን ክፈት',
  'My Profile': 'የእኔ መገለጫ',
  'Change Password': 'የይለፍ ቃል ይቀይሩ',
  'Dashboard Settings': 'የዳሽቦርድ ቅንብሮች',
  'Logout': 'ውጣ',
  'Employee System': 'የሰራተኛ ስርዓት',
  'Employee': 'ሰራተኛ',
  'Department Head': 'የዲፓርትመንት ኃላፊ',
  'Dashboard': 'ዳሽቦርድ',
  'My Clearance': 'የእኔ ክሊራንስ',
  'Documents': 'ሰነዶች',
  'My Certificates': 'የእኔ ሰርተፊኬቶች',
  'Close menu': 'ምናሌውን ዝጋ',
  'unread': 'ያልተነበቡ',
  'All': 'ሁሉም',
  'Unread': 'ያልተነበቡ',
  'Mark all as read': 'ሁሉንም እንደተነበቡ ምልክት አድርግ',
  'Loading notifications...': 'ማሳወቂያዎች በመጫን ላይ...',
  'No notifications found.': 'ምንም ማሳወቂያ አልተገኘም።',
  'Unable to load notifications.': 'ማሳወቂያዎችን መጫን አልተቻለም።',
  'Unable to update notification status.': 'የማሳወቂያ ሁኔታን ማዘመን አልተቻለም።',
  'Unable to delete notification.': 'ማሳወቂያውን መሰረዝ አልተቻለም።',
  'Unable to delete notification: notification id is missing.': 'ማሳወቂያውን መሰረዝ አልተቻለም፤ የማሳወቂያ መለያ የለውም።',
  'Delete notification': 'ማሳወቂያውን ሰርዝ',
  'Unread Summary': 'ያልተነበቡ ማሳወቂያዎች ማጠቃለያ',
  'New Requests': 'አዲስ ጥያቄዎች',
  'Department Completed': 'በዲፓርትመንት የተጠናቀቁ',
  'Pending': 'በመጠባበቅ ላይ',
  'Returned': 'ተመልሰዋል',
  'Ready for Final Review': 'ለመጨረሻ ግምገማ ዝግጁ',
  'Total Unread': 'ጠቅላላ ያልተነበቡ',
  'Clearance Requests': 'የክሊራንስ ጥያቄዎች',
  'View all clearance requests': 'ሁሉንም የክሊራንስ ጥያቄዎች ይመልከቱ',
  'Pending Follow Ups': 'በመጠባበቅ ላይ ያሉ ክትትሎች',
  'Follow up pending clearances': 'በመጠባበቅ ላይ ያሉ ክሊራንሶችን ይከታተሉ',
  'Reports': 'ሪፖርቶች',
  'View reports': 'ሪፖርቶችን ይመልከቱ',
  'Create Clearance Request': 'የክሊራንስ ጥያቄ ይፍጠሩ',
  'Submit your clearance request': 'የክሊራንስ ጥያቄዎን ያስገቡ',
  'View clearance reports': 'የክሊራንስ ሪፖርቶችን ይመልከቱ',
  'View Details': 'ዝርዝሩን ይመልከቱ',
  'View Request': 'ጥያቄውን ይመልከቱ',
  'View Clearance': 'ክሊራንሱን ይመልከቱ',
  'Review Request': 'ጥያቄውን ይገምግሙ',
  'Request': 'ጥያቄ',
  'Clearance Request Submitted': 'የክሊራንስ ጥያቄ ቀርቧል',
  'Clearance Request Cancelled': 'የክሊራንስ ጥያቄ ተሰርዟል',
  'Clearance Updated': 'ክሊራንሱ ተዘምኗል',
  'Clearance Request Returned': 'የክሊራንስ ጥያቄ ተመልሷል',
  'Department Clearance Approved': 'የዲፓርትመንት ክሊራንስ ጸድቋል',
  'Clearance In Progress': 'ክሊራንሱ በሂደት ላይ ነው',
  'Library Clearance Approved': 'የቤተ-መጽሐፍት ክሊራንስ ጸድቋል',
  'Finance Clearance Approved': 'የፋይናንስ ክሊራንስ ጸድቋል',
  'Property Clearance Approved': 'የንብረት ክሊራንስ ጸድቋል',
  'ICT Clearance Approved': 'የአይሲቲ ክሊራንስ ጸድቋል',
  'New Clearance Request': 'አዲስ የክሊራንስ ጥያቄ',
  'All Department Tasks Completed': 'ሁሉም የዲፓርትመንት ስራዎች ተጠናቀዋል',
  'New Request': 'አዲስ ጥያቄ',
  'Request Submitted': 'ጥያቄ ቀርቧል',
  'Request Returned': 'ጥያቄ ተመልሷል',
  'Request Approved': 'ጥያቄ ጸድቋል',
  'Settings': 'ቅንብሮች',
  'Manage your notification preferences and appearance settings.': 'የማሳወቂያ ምርጫዎችዎን እና የመልክ ቅንብሮችዎን ያስተዳድሩ።',
  'Notification Preferences': 'የማሳወቂያ ምርጫዎች',
  'Choose which notifications you want to receive.': 'የትኞቹን ማሳወቂያዎች መቀበል እንደሚፈልጉ ይምረጡ።',
  'Email Notifications': 'የኢሜይል ማሳወቂያዎች',
  'Receive notifications via email.': 'ማሳወቂያዎችን በኢሜይል ይቀበሉ።',
  'Clearance Updates': 'የክሊራንስ ዝመናዎች',
  'Get notified about clearance status changes.': 'የክሊራንስ ሁኔታ ሲቀየር ማሳወቂያ ይቀበሉ።',
  'Be notified when your request is returned.': 'ጥያቄዎ ሲመለስ ማሳወቂያ ይቀበሉ።',
  'Request Resubmitted': 'ጥያቄ እንደገና ሲላክ',
  'Get notified when your request is resubmitted.': 'ጥያቄዎ እንደገና ሲላክ ማሳወቂያ ይቀበሉ።',
  'Pending Review Reminder': 'የግምገማ ማስታወሻ',
  'Receive reminders for requests pending your review.': 'ግምገማ የሚጠብቁ ጥያቄዎችን የሚመለከት ማስታወሻ ይቀበሉ።',
  'Appearance': 'መልክ',
  'Customize the look and feel of the application.': 'የመተግበሪያውን ገጽታ ያብጁ።',
  'Theme': 'ገጽታ',
  'Light': 'ብርሃን',
  'Bright and clean': 'ብሩህ እና ንጹህ',
  'Dark': 'ጨለማ',
  'Easy on your eyes': 'ለዓይንዎ ምቹ',
  'System': 'የስርዓት',
  'Follow your device': 'የመሣሪያዎን ቅንብር ይከተሉ',
  'English': 'እንግሊዝኛ',
  'Amharic': 'አማርኛ',
  'Display Preferences': 'የማሳያ ምርጫዎች',
  'Adjust how information is displayed in the system.': 'መረጃዎች በስርዓቱ ውስጥ እንዴት እንደሚታዩ ያስተካክሉ።',
  'Items per Page': 'በአንድ ገጽ የሚታዩ ንጥሎች',
  'Reset to Default': 'ወደ ነባሪ መመለስ',
  'Save Changes': 'ለውጦችን አስቀምጥ',
  'Settings saved successfully!': 'ቅንብሮች በተሳካ ሁኔታ ተቀምጠዋል!',
  'Unable to load settings. Please try again.': 'ቅንብሮችን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
  'Unable to save settings. Please try again.': 'ቅንብሮችን ማስቀመጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
  'Settings reset to default. Save your changes to keep them.': 'ቅንብሮች ወደ ነባሪ ተመልሰዋል። ለማስቀመጥ ለውጦቹን ያስቀምጡ።',
  'Loading settings...': 'ቅንብሮች በመጫን ላይ...',
  'Saving...': 'በማስቀመጥ ላይ...',
  'Welcome back,': 'እንኳን ተመለሱ፣',
  'Here is an overview of your clearance status.': 'የክሊራንስዎ ሁኔታ አጠቃላይ እይታ ይኸውና።',
  'Current Clearance Request': 'የአሁኑ የክሊራንስ ጥያቄ',
  'View Clearance Details': 'የክሊራንስ ዝርዝር ይመልከቱ',
  'Loading current clearance...': 'የአሁኑ ክሊራንስ በመጫን ላይ...',
  'Request No:': 'የጥያቄ ቁጥር፦',
  'Request Date:': 'የጥያቄ ቀን፦',
  'Overall Status:': 'አጠቃላይ ሁኔታ፦',
  'Progress:': 'ሂደት፦',
  'Offices': 'ቢሮዎች',
  'Office Status': 'የቢሮ ሁኔታ',
  'No active clearance request found.': 'ንቁ የክሊራንስ ጥያቄ አልተገኘም።',
  'Action Required': 'እርምጃ ያስፈልጋል',
  'Your clearance request has been returned by': 'የክሊራንስ ጥያቄዎ በዚህ ቢሮ ተመልሷል፦',
  'Reason:': 'ምክንያት፦',
  'Resubmit Request': 'ጥያቄውን እንደገና ይላኩ',
  'Recent Requests': 'የቅርብ ጊዜ ጥያቄዎች',
  'View All Requests': 'ሁሉንም ጥያቄዎች ይመልከቱ',
  'Action': 'እርምጃ',
  'No recent requests found.': 'የቅርብ ጊዜ ጥያቄዎች አልተገኙም።',
  'Employee Clearance Certificate': 'የሰራተኛ ክሊራንስ ሰርተፊኬት',
  'Certificate No:': 'የሰርተፊኬት ቁጥር፦',
  'Issue Date:': 'የተሰጠበት ቀን፦',
  'ISSUED': 'ተሰጥቷል',
  'Download': 'አውርድ',
  'No certificate issued yet.': 'እስካሁን ሰርተፊኬት አልተሰጠም።',
  'Your certificate will appear here once it is issued.': 'ሰርተፊኬትዎ ሲሰጥ እዚህ ይታያል።',
  'Recent Notifications': 'የቅርብ ጊዜ ማሳወቂያዎች',
  'View All Notifications': 'ሁሉንም ማሳወቂያዎች ይመልከቱ',
  'No recent notifications.': 'የቅርብ ጊዜ ማሳወቂያዎች የሉም።',
  'Quick Actions': 'ፈጣን እርምጃዎች',
  'My Requests': 'የእኔ ጥያቄዎች',
  'Total Requests': 'ጠቅላላ ጥያቄዎች',
  'Clearance Active': 'ክሊራንስ በሂደት ላይ',
  'Needs Attention': 'ትኩረት ያስፈልጋል',
  'Certificates': 'ሰርተፊኬቶች',
  'Issued': 'ተሰጥቷል',
  'My Clearance Requests': 'የእኔ የክሊራንስ ጥያቄዎች',
  'Approved': 'ጸድቋል',
  'Completed': 'ተጠናቋል',
  'Property / Asset Office': 'የንብረት ቢሮ',
  'Finance Office': 'የፋይናንስ ቢሮ',
  'ICT Office': 'የአይሲቲ ቢሮ',
  'Library Office': 'የቤተ-መጽሐፍት ቢሮ',
  'Final HR Clearance': 'የመጨረሻ የHR ክሊራንስ',
  'View': 'ይመልከቱ',
  'Type': 'ዓይነት',
  'Status': 'ሁኔታ',
  'Status:': 'ሁኔታ፦',
  'Request No': 'የጥያቄ ቁጥር',
  'Rejected': 'ውድቅ ተደርጓል',
  'Resignation': 'ስራ መልቀቅ',
  'Employee Information': 'የሰራተኛ መረጃ',
  'Full Name': 'ሙሉ ስም',
  'Employee ID': 'የሰራተኛ መለያ ቁጥር',
  'Department': 'ዲፓርትመንት',
  'Position': 'የስራ መደብ',
  'Email': 'ኢሜይል',
  'Phone': 'ስልክ',
  'Campus': 'ካምፓስ',
  'College / Institute': 'ኮሌጅ / ኢንስቲትዩት',
  'Employee information is loaded from your profile.': 'የሰራተኛ መረጃ ከመገለጫዎ ተጭኗል።',
  'Clearance Request Information': 'የክሊራንስ ጥያቄ መረጃ',
  'Clearance Type': 'የክሊራንስ ዓይነት',
  'Loading clearance types...': 'የክሊራንስ ዓይነቶችን በመጫን ላይ...',
  'Select Clearance Type': 'የክሊራንስ ዓይነት ይምረጡ',
  'No active clearance types are available. Please contact HR.': 'ንቁ የክሊራንስ ዓይነቶች የሉም። እባክዎ HRን ያነጋግሩ።',
  'Reason': 'ምክንያት',
  'Explain your reason for requesting clearance.': 'ክሊራንስ የሚጠይቁበትን ምክንያት ያብራሩ።',
  'Last Working Date': 'የመጨረሻ የስራ ቀን',
  'Additional Remark (Optional)': 'ተጨማሪ አስተያየት (አማራጭ)',
  'Supporting Documents': 'ደጋፊ ሰነዶች',
  'Other Document (Optional)': 'ሌላ ሰነድ (አማራጭ)',
  'Thank you.': 'እናመሰግናለን።',
  'I confirm that the information provided is correct.': 'የሰጠሁት መረጃ ትክክል መሆኑን አረጋግጣለሁ።',
  'Resignation Letter': 'የስራ መልቀቂያ ደብዳቤ',
  'ID Copy': 'የመታወቂያ ቅጂ',
  'No file chosen': 'ምንም ፋይል አልተመረጠም',
  'View and download certificates issued by the Human Resource Office.': 'በሰው ሀብት ቢሮ የተሰጡ ሰርተፊኬቶችን ይመልከቱ እና ያውርዱ።',
  'Loading certificates...': 'ሰርተፊኬቶችን በመጫን ላይ...',
};

const translateEmployeeNotification = (text) => {
  let match = text.match(/^Your clearance request has been submitted successfully\. Request No: (.+)$/);
  if (match) return `የክሊራንስ ጥያቄዎ በተሳካ ሁኔታ ቀርቧል። የጥያቄ ቁጥር: ${match[1]}`;

  match = text.match(/^Your clearance request (.+) has been cancelled\.$/);
  if (match) return `የክሊራንስ ጥያቄዎ ${match[1]} ተሰርዟል።`;

  match = text.match(/^Department clearance for (.+) was approved\.$/);
  if (match) return `ለ ${match[1]} የቀረበው የዲፓርትመንት ክሊራንስ ጸድቋል።`;

  match = text.match(/^Your (.+) has been completed successfully\.$/);
  if (match) return `የእርስዎ ${match[1]} በተሳካ ሁኔታ ተጠናቋል።`;

  if (text === 'Your clearance request is currently under review. Some offices are still pending.') {
    return 'የክሊራንስ ጥያቄዎ አሁን በግምገማ ላይ ነው። አንዳንድ ቢሮዎች በመጠባበቅ ላይ ናቸው።';
  }

  return text;
};

export function EmployeeLanguageProvider({ children }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState(() => (
    normalizeLanguage(readEmployeeSettings().language || localStorage.getItem(LANGUAGE_KEY))
  ));
  const [theme, setTheme] = useState(() => normalizeTheme(readEmployeeSettings().theme));
  const [itemsPerPage, setItemsPerPage] = useState(() => normalizeItemsPerPage(readEmployeeSettings().itemsPerPage));
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches || false);
  const userId = user?._id || user?.id;
  const activeRole = String(user?.activeRole || user?.role || '').trim().toLowerCase();
  const previewLanguage = useCallback((nextLanguage) => setLanguageState(normalizeLanguage(nextLanguage)), []);
  const setLanguage = useCallback((nextLanguage) => {
    const next = normalizeLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_KEY, next);
    setLanguageState(next);
  }, []);

  useEffect(() => {
    if (!userId || !['employee', 'standard user', 'user'].includes(activeRole)) return undefined;

    const controller = new AbortController();
    const loadPreferences = async () => {
      try {
        const { data } = await axios.get(`/api/profile/${encodeURIComponent(userId)}/settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          signal: controller.signal,
        });
        if (!data?.success || !data.settings?.displayPreferences) {
          throw new Error(data?.message || 'Invalid employee settings response.');
        }

        const preferences = {
          ...data.settings.notificationPreferences,
          ...data.settings.displayPreferences,
        };
        setLanguage(data.settings.displayPreferences.language);
        setTheme(normalizeTheme(data.settings.displayPreferences.theme));
        setItemsPerPage(normalizeItemsPerPage(data.settings.displayPreferences.itemsPerPage));
        localStorage.setItem('employeeSettings', JSON.stringify(preferences));
      } catch (error) {
        if (!controller.signal.aborted) console.error('Unable to load saved employee preferences:', error);
      }
    };

    loadPreferences();
    return () => controller.abort();
  }, [activeRole, setLanguage, userId]);

  useEffect(() => {
    if (theme !== 'system') return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = (event) => setSystemPrefersDark(event.matches);
    media.addEventListener?.('change', updateSystemTheme);
    return () => media.removeEventListener?.('change', updateSystemTheme);
  }, [theme]);

  const resolvedTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;

  const value = useMemo(() => ({
    language,
    setLanguage,
    previewLanguage,
    theme,
    setTheme,
    resolvedTheme,
    itemsPerPage,
    setItemsPerPage,
    t: (english) => {
      if (language !== 'am') return english;
      const text = String(english ?? '');
      return translations[text] || translateEmployeeNotification(text);
    },
  }), [itemsPerPage, language, previewLanguage, resolvedTheme, setLanguage, theme]);

  return <EmployeeLanguageContext.Provider value={value}>{children}</EmployeeLanguageContext.Provider>;
}

function normalizeLanguage(value) {
  return value === 'am' || value === 'Amharic' ? 'am' : 'en';
}

function normalizeTheme(value) {
  return ['light', 'dark', 'system'].includes(value) ? value : 'light';
}

function normalizeItemsPerPage(value) {
  const normalized = Number(value);
  return [10, 20, 50, 100].includes(normalized) ? normalized : 20;
}

function readEmployeeSettings() {
  try {
    return JSON.parse(localStorage.getItem('employeeSettings') || '{}');
  } catch {
    return {};
  }
}

export function useEmployeeLanguage() {
  const context = useContext(EmployeeLanguageContext);
  if (!context) throw new Error('useEmployeeLanguage must be used inside EmployeeLanguageProvider.');
  return context;
}
