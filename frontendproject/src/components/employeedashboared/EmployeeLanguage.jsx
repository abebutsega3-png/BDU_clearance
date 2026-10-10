import { createContext, useContext, useMemo, useState } from 'react';

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
  'Settings': 'ቅንብሮች',
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
  'Quick Actions': 'ፈጣን እርምጃዎች',
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
  const [language, setLanguageState] = useState(() => (
    localStorage.getItem(LANGUAGE_KEY) === 'am' ? 'am' : 'en'
  ));

  const setLanguage = (nextLanguage) => {
    const next = nextLanguage === 'am' ? 'am' : 'en';
    localStorage.setItem(LANGUAGE_KEY, next);
    setLanguageState(next);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (english) => {
      if (language !== 'am') return english;
      const text = String(english ?? '');
      return translations[text] || translateEmployeeNotification(text);
    },
  }), [language]);

  return <EmployeeLanguageContext.Provider value={value}>{children}</EmployeeLanguageContext.Provider>;
}

export function useEmployeeLanguage() {
  const context = useContext(EmployeeLanguageContext);
  if (!context) throw new Error('useEmployeeLanguage must be used inside EmployeeLanguageProvider.');
  return context;
}
