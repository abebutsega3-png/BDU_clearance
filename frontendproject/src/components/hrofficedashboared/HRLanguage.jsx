import { cloneElement, createContext, isValidElement, useContext, useMemo, useState } from 'react';

const HRLanguageContext = createContext(null);
const LANGUAGE_KEY = 'hrOfficerLanguage';

const translations = {
  'Employee System': 'የሰራተኞች ስርዓት',
  'HR Officer': 'የሰው ሀብት ኦፊሰር',
  Clearance: 'ማጽዳት',
  'All Requests': 'ሁሉም ጥያቄዎች',
  'Pending Requests': 'በመጠባበቅ ላይ ያሉ ጥያቄዎች',
  'In Progress': 'በሂደት ላይ',
  Returned: 'ተመልሷል',
  Completed: 'ተጠናቋል',
  'HR Assessment': 'የሰው ሀብት ግምገማ',
  'Office Clearance Status': 'የቢሮ ማጽዳት ሁኔታ',
  'HR Reports': 'የሰው ሀብት ሪፖርቶች',
  'HR navigation': 'የሰው ሀብት አሰሳ',
  'HR account': 'የሰው ሀብት መለያ',
  Dashboard: 'ዳሽቦርድ',
  Employees: 'ሰራተኞች',
  'Clearance Requests': 'የማጽዳት ጥያቄዎች',
  'HR Status': 'የሰው ሀብት ሁኔታ',
  'Final HR Clearance': 'የመጨረሻ የሰው ሀብት ማጽዳት',
  Certificates: 'ሰርተፊኬቶች',
  'HR Report': 'የሰው ሀብት ሪፖርት',
  Settings: 'ቅንብሮች',
  Logout: 'ውጣ',
  'Sign Out': 'ውጣ',
  'My Dashboard': 'ዳሽቦርዴ',
  'View Profile': 'መገለጫን ይመልከቱ',
  'Change Password': 'የይለፍ ቃል ይቀይሩ',
  'Dashboard Settings': 'የዳሽቦርድ ቅንብሮች',
  'Open HR Officer menu': 'የሰው ሀብት ኦፊሰር ምናሌን ክፈት',
  'HR notifications': 'የሰው ሀብት ማሳወቂያዎች',
  Notifications: 'ማሳወቂያዎች',
  'Dashboard / Employees / Employee List': 'ዳሽቦርድ / ሰራተኞች / የሰራተኞች ዝርዝር',
  'Employee List': 'የሰራተኞች ዝርዝር',
  'View and manage all employees in the organization.': 'በድርጅቱ ውስጥ ያሉ ሁሉንም ሰራተኞች ይመልከቱ እና ያስተዳድሩ።',
  'S NO': 'ተ.ቁ',
  Photo: 'ፎቶ',
  'Full Name': 'ሙሉ ስም',
  Gender: 'ጾታ',
  'No employees found.': 'ምንም ሰራተኛ አልተገኘም።',
  'Loading employees...': 'ሰራተኞች በመጫን ላይ...',
  All: 'ሁሉም',
  'View employee': 'ሰራተኛውን ይመልከቱ',
  'Edit employee': 'ሰራተኛውን ያርትዑ',
  'Add Employee': 'ሰራተኛ ያክሉ',
  'Search by name, ID, phone or email...': 'በስም፣ መለያ፣ ስልክ ወይም ኢሜይል ይፈልጉ...',
  'Search by employee name or ID...': 'በሰራተኛ ስም ወይም መለያ ይፈልጉ...',
  'All Status': 'ሁሉም ሁኔታዎች',
  'All Department': 'ሁሉም የሥራ ክፍሎች',
  'All Departments': 'ሁሉም የሥራ ክፍሎች',
  'All Campus': 'ሁሉም ግቢዎች',
  'All Campuses': 'ሁሉም ግቢዎች',
  'All Types': 'ሁሉም ዓይነቶች',
  Active: 'ንቁ',
  Inactive: 'ንቁ ያልሆነ',
  Pending: 'በመጠባበቅ ላይ',
  'Under Review': 'በግምገማ ላይ',
  Approved: 'ጸድቋል',
  Completed: 'ተጠናቋል',
  Returned: 'ተመልሷል',
  Rejected: 'ውድቅ ተደርጓል',
  Department: 'የሥራ ክፍል',
  Campus: 'ግቢ',
  'Employment Type': 'የቅጥር ዓይነት',
  Status: 'ሁኔታ',
  Reset: 'ዳግም አስጀምር',
  'Clearance Requests / All Requests': 'የማጽዳት ጥያቄዎች / ሁሉም ጥያቄዎች',
  'All Requests': 'ሁሉም ጥያቄዎች',
  'Create Request': 'ጥያቄ ይፍጠሩ',
  Filter: 'አጣራ',
  Employee: 'ሰራተኛ',
  'Employee ID': 'የሰራተኛ መለያ',
  'Request Date': 'የጥያቄ ቀን',
  'Last Working Date': 'የመጨረሻ የሥራ ቀን',
  Action: 'ተግባር',
  View: 'ይመልከቱ',
  'No clearance requests found.': 'ምንም የማጽዳት ጥያቄ አልተገኘም።',
  'Loading clearance requests...': 'የማጽዳት ጥያቄዎች በመጫን ላይ...',
  'Clearance Request Details': 'የማጽዳት ጥያቄ ዝርዝር',
  'Review employee clearance request': 'የሰራተኛውን የማጽዳት ጥያቄ ይገምግሙ',
  'Loading request details...': 'የጥያቄ ዝርዝር በመጫን ላይ...',
  'Employee Name': 'የሰራተኛ ስም',
  Position: 'የሥራ መደብ',
  Email: 'ኢሜይል',
  Phone: 'ስልክ',
  'Request No': 'የጥያቄ ቁጥር',
  'Clearance Type': 'የማጽዳት ዓይነት',
  Reason: 'ምክንያት',
  'Current Status': 'የአሁኑ ሁኔታ',
  'Supporting Documents': 'ደጋፊ ሰነዶች',
  'No supporting documents attached.': 'ምንም ደጋፊ ሰነድ አልተያያዘም።',
  'View attached document': 'የተያያዘውን ሰነድ ይመልከቱ',
  'HR Initial Review': 'የመጀመሪያ የሰው ሀብት ግምገማ',
  'Review Status:': 'የግምገማ ሁኔታ፦',
  'Start Review': 'ግምገማ ይጀምሩ',
  Starting: 'በመጀመር ላይ',
  'Verification Result': 'የማረጋገጫ ውጤት',
  Accept: 'ተቀበል',
  Return: 'መልስ',
  'HR Comment / Remark': 'የሰው ሀብት አስተያየት',
  'Add HR review remarks...': 'የሰው ሀብት ግምገማ አስተያየት ያክሉ...',
  'Return Reason': 'የመመለሻ ምክንያት',
  'Save Decision': 'ውሳኔውን ያስቀምጡ',
  Cancel: 'ይቅር',
  'Total Employees': 'ጠቅላላ ሰራተኞች',
  'Active Employees': 'ንቁ ሰራተኞች',
  'Awaiting HR Review': 'የሰው ሀብት ግምገማ በመጠባበቅ ላይ',
  'Returned Requests': 'የተመለሱ ጥያቄዎች',
  'Ready for Final HR': 'ለመጨረሻ የሰው ሀብት ግምገማ ዝግጁ',
  'Finalized Clearances': 'የተጠናቀቁ ማጽዳቶች',
  'All registered employees': 'ሁሉም የተመዘገቡ ሰራተኞች',
  'Currently active employees': 'አሁን ንቁ የሆኑ ሰራተኞች',
  'Requests waiting for initial review': 'የመጀመሪያ ግምገማ የሚጠብቁ ጥያቄዎች',
  'Requests returned for correction': 'ለማስተካከያ የተመለሱ ጥያቄዎች',
  'Completed office clearances': 'የተጠናቀቁ የቢሮ ማጽዳቶች',
  'HR approved and completed': 'በሰው ሀብት የጸደቁ እና የተጠናቀቁ',
  'View all employees': 'ሁሉንም ሰራተኞች ይመልከቱ',
  'View employees': 'ሰራተኞችን ይመልከቱ',
  'Review requests': 'ጥያቄዎችን ይገምግሙ',
  'View requests': 'ጥያቄዎችን ይመልከቱ',
  'Open final review': 'የመጨረሻ ግምገማን ይክፈቱ',
  'View certificates': 'ሰርተፊኬቶችን ይመልከቱ',
  'Clearance Overview': 'የማጽዳት አጠቃላይ እይታ',
  'Recent Clearance Requests': 'የቅርብ ጊዜ የማጽዳት ጥያቄዎች',
  'Pending Actions': 'በመጠባበቅ ላይ ያሉ እርምጃዎች',
  'Employees by Campus': 'ሰራተኞች በግቢ',
  'Recent Activity': 'የቅርብ ጊዜ እንቅስቃሴ',
  Total: 'ጠቅላላ',
  'No recent activity found': 'በቅርቡ ምንም እንቅስቃሴ አልተገኘም።',
  Showing: 'በማሳየት ላይ',
  entries: 'መዝገቦች',
  'No campus data found': 'የግቢ መረጃ አልተገኘም።',
  'View report': 'ሪፖርቱን ይመልከቱ',
  'View Reports': 'ሪፖርቶችን ይመልከቱ',
  'Loading notifications...': 'ማሳወቂያዎች በመጫን ላይ...',
  'No notifications found': 'ምንም ማሳወቂያ አልተገኘም።',
  'Welcome back': 'እንኳን በደህና ተመለሱ',
  'View All': 'ሁሉንም ይመልከቱ',
  'Loading HR dashboard data...': 'የሰው ሀብት ዳሽቦርድ መረጃ በመጫን ላይ...',
  'Retry': 'እንደገና ይሞክሩ',
  'Filter by status': 'በሁኔታ አጣራ',
  'Select Department': 'የሥራ ክፍል ይምረጡ',
};

function originalOptionText(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(originalOptionText).join('');
  return isValidElement(node) ? originalOptionText(node.props.children) : '';
}

function translateNode(node, t) {
  if (typeof node === 'string') return t(node);
  if (Array.isArray(node)) return node.map((child) => translateNode(child, t));
  if (!isValidElement(node)) return node;

  const props = { ...node.props };
  for (const name of ['aria-label', 'label', 'placeholder', 'title']) {
    if (typeof props[name] === 'string') props[name] = t(props[name]);
  }
  const children = translateNode(node.props.children, t);
  if (node.type === 'option' && props.value === undefined) {
    props.value = originalOptionText(node.props.children).trim();
  }
  return cloneElement(node, props, children);
}

export function HRTranslatedView({ children }) {
  const { t } = useOptionalHRLanguage();
  return translateNode(children, t);
}

export function HRLanguageProvider({ children }) {
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
    t: (english, amharic) => {
      if (language !== 'am') return english;
      const leadingSpace = english.match(/^\s*/)?.[0] || '';
      const trailingSpace = english.match(/\s*$/)?.[0] || '';
      const key = english.trim();
      return `${leadingSpace}${amharic || translations[key] || key}${trailingSpace}`;
    },
  }), [language]);

  return <HRLanguageContext.Provider value={value}>{children}</HRLanguageContext.Provider>;
}

export function useHRLanguage() {
  const context = useContext(HRLanguageContext);
  if (!context) throw new Error('useHRLanguage must be used inside HRLanguageProvider.');
  return context;
}

export function useOptionalHRLanguage() {
  const context = useContext(HRLanguageContext);
  return context || { language: 'en', t: (english) => english };
}
