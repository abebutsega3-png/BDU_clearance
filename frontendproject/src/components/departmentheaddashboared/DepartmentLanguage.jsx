import { createContext, useContext, useMemo, useState } from 'react';

const DepartmentLanguageContext = createContext(null);
const LANGUAGE_KEY = 'department-head-language';

const translations = {
  'Department Head': 'የዲፓርትመንት ኃላፊ',
  'Clearance System': 'የክሊራንስ ስርዓት',
  Dashboard: 'ዳሽቦርድ',
  'Clearance Requests': 'የክሊራንስ ጥያቄዎች',
  'Department Clearance': 'የዲፓርትመንት ክሊራንስ',
  'Department Employees': 'የዲፓርትመንት ሰራተኞች',
  'Clearance History': 'የክሊራንስ ታሪክ',
  Notifications: 'ማሳወቂያዎች',
  Reports: 'ሪፖርቶች',
  Settings: 'ቅንብሮች',
  'My Profile': 'የእኔ መገለጫ',
  Logout: 'ውጣ',
  'Welcome ': 'እንኳን ደህና መጡ ',
  'Open department notifications': 'የዲፓርትመንት ማሳወቂያዎችን ክፈት',
  'Open Department Head menu': 'የዲፓርትመንት ኃላፊ ምናሌን ክፈት',
  'Department Head profile': 'የዲፓርትመንት ኃላፊ መገለጫ',
  'My Dashboard': 'ዳሽቦርዴ',
  'View Profile': 'መገለጫን ይመልከቱ',
  'Change Password': 'የይለፍ ቃል ይቀይሩ',
  'Sign Out': 'ውጣ',
};

export function DepartmentLanguageProvider({ children }) {
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
    t: (english) => language === 'am' ? (translations[english] || english) : english,
  }), [language]);

  return <DepartmentLanguageContext.Provider value={value}>{children}</DepartmentLanguageContext.Provider>;
}

export function useDepartmentLanguage() {
  const context = useContext(DepartmentLanguageContext);
  if (!context) throw new Error('useDepartmentLanguage must be used inside DepartmentLanguageProvider.');
  return context;
}
