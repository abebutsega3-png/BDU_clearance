import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LibraryLanguageContext = createContext(null);
const LANGUAGE_KEY = 'library-officer-language';

const translations = {
  Welcome: 'እንኳን ደህና መጡ',
  Librarian: 'የቤተ መጻሕፍት ባለሙያ',
  'Library Officer account': 'የቤተ መጻሕፍት ኦፊሰር መለያ',
  'Library notifications': 'የቤተ መጻሕፍት ማሳወቂያዎች',
  Notifications: 'ማሳወቂያዎች',
  'My Dashboard': 'ዳሽቦርዴ',
  'View Profile': 'ፕሮፋይል ይመልከቱ',
  'Dashboard Settings': 'የዳሽቦርድ ቅንብሮች',
  'Back to Dashboard': 'ወደ ዳሽቦርድ ተመለስ',
  'Manage your dashboard appearance and account settings.': 'የዳሽቦርድዎን ገጽታ እና የመለያ ቅንብሮችን ያስተዳድሩ።',
  Appearance: 'ገጽታ',
  'Dark mode': 'ጨለማ ሁነታ',
  'Use a darker appearance on this settings page.': 'በዚህ የቅንብር ገጽ ላይ ጨለማ ገጽታ ይጠቀሙ።',
  'Enable dark mode': 'ጨለማ ሁነታን አንቃ',
  'Account security': 'የመለያ ደህንነት',
  'Sign Out': 'ውጣ',
  'Library System': 'የቤተ መጻሕፍት ስርዓት',
  Dashboard: 'ዳሽቦርድ',
  'Clearance Requests': 'የክሊራንስ ጥያቄዎች',
  'Library Record Management': 'የቤተ መጻሕፍት መዝገብ አስተዳደር',
  'Clearance History': 'የክሊራንስ ታሪክ',
  Reports: 'ሪፖርቶች',
  Settings: 'ቅንብሮች',
  Logout: 'ውጣ',
  'Manage library information, clearance verification rules, notifications, and account security.': 'የቤተ መጻሕፍት መረጃ፣ የክሊራንስ ማረጋገጫ ደንቦች፣ ማሳወቂያዎች እና የመለያ ደህንነት ያስተዳድሩ።',
  'Settings sections': 'የቅንብር ክፍሎች',
  'Settings section': 'የቅንብር ክፍል',
  'Settings menu': 'የቅንብር ምናሌ',
  'Choose a section to manage your Library settings.': 'የቤተ መጻሕፍት ቅንብሮችን ለማስተዳደር ክፍል ይምረጡ።',
  'Secure preferences': 'ደህንነቱ የተጠበቁ ምርጫዎች',
  'Your changes are saved to your signed-in officer account.': 'ለውጦችዎ በገቡበት የኦፊሰር መለያ ውስጥ ይቀመጣሉ።',
  'Library Officer': 'የቤተ መጻሕፍት ኦፊሰር',
  'General Settings': 'አጠቃላይ ቅንብሮች',
  'Library and office contact information.': 'የቤተ መጻሕፍት እና የቢሮ የመገኛ መረጃ።',
  'Required checks before approving library clearance.': 'የቤተ መጻሕፍት ክሊራንስ ከመፍቀድ በፊት የሚያስፈልጉ ምርመራዎች።',
  'Review items for processing employee clearance.': 'የሰራተኛ ክሊራንስ ሲከናወን የሚመረመሩ ነጥቦች።',
  'Choose which updates and delivery channels to use.': 'የሚቀበሉትን ዝማኔዎችና የማድረሻ መንገዶችን ይምረጡ።',
  'Officer account details and password settings.': 'የኦፊሰሩ መለያ መረጃና የይለፍ ቃል ቅንብሮች።',
  'Library Name': 'የቤተ መጻሕፍት ስም',
  'Office Name': 'የቢሮ ስም',
  'Office Contact Email': 'የቢሮ ኢሜይል',
  'Phone Number': 'ስልክ ቁጥር',
  'Office Location': 'የቢሮ አድራሻ',
  'Save Changes': 'ለውጦችን አስቀምጥ',
  'Clearance Rules': 'የክሊራንስ ደንቦች',
  'Define the checks required before an employee can receive Library clearance.': 'ሰራተኛ የቤተ መጻሕፍት ክሊራንስ ከማግኘቱ በፊት የሚያስፈልጉ ምርመራዎችን ይወስኑ።',
  'Check for unreturned books': 'ያልተመለሱ መጻሕፍትን ያረጋግጡ',
  'Check for overdue books': 'የዘገዩ መጻሕፍትን ያረጋግጡ',
  'Check for outstanding fines': 'ያልተከፈሉ ቅጣቶችን ያረጋግጡ',
  'Check for lost or damaged books': 'የጠፉ ወይም የተበላሹ መጻሕፍትን ያረጋግጡ',
  'Require all enabled verification checks before clearance': 'ክሊራንስ ከመፍቀድ በፊት ሁሉም የተነቁ ምርመራዎች እንዲጠናቀቁ ይጠይቁ',
  'Clearance Verification Checklist': 'የክሊራንስ ማረጋገጫ ዝርዝር',
  'Library Officer review items recorded while processing employee clearance.': 'የሰራተኛ ክሊራንስ ሲከናወን የሚመዘገቡ የቤተ መጻሕፍት ኦፊሰር ምርመራዎች።',
  'Borrowed books checked': 'የተበደሩ መጻሕፍት ተመርምረዋል',
  'Unreturned books checked': 'ያልተመለሱ መጻሕፍት ተመርምረዋል',
  'Outstanding materials checked': 'ያልተመለሱ እቃዎች ተመርምረዋል',
  'Lost / damaged materials checked': 'የጠፉ / የተበላሹ እቃዎች ተመርምረዋል',
  'Library account checked': 'የቤተ መጻሕፍት መለያ ተመርምሯል',
  'Notification Settings': 'የማሳወቂያ ቅንብሮች',
  'Choose which employee-clearance updates to receive and where they are delivered.': 'የትኞቹን የክሊራንስ ዝማኔዎች እንደሚቀበሉ እና የሚደርሱበትን መንገድ ይምረጡ።',
  'Notification Events': 'የማሳወቂያ ክስተቶች',
  'New clearance request': 'አዲስ የክሊራንስ ጥያቄ',
  'Clearance request returned / resubmitted': 'የተመለሰ / እንደገና የቀረበ የክሊራንስ ጥያቄ',
  'Clearance status updated': 'የክሊራንስ ሁኔታ ተዘምኗል',
  'Delivery Channels': 'የማድረሻ መንገዶች',
  'In-app notifications': 'በሲስተሙ ውስጥ ማሳወቂያ',
  'Email notifications': 'የኢሜይል ማሳወቂያ',
  'Account & Security': 'መለያ እና ደህንነት',
  'Signed-in officer identity and account protection.': 'የገቡት ኦፊሰር መረጃ እና የመለያ ጥበቃ።',
  'Officer Name': 'የኦፊሰር ስም',
  'Employee ID': 'የሰራተኛ መለያ',
  Username: 'የተጠቃሚ ስም',
  Email: 'ኢሜይል',
  'Change Password': 'የይለፍ ቃል ቀይር',
  'Unable to identify the signed-in Library Officer.': 'የገቡትን የቤተ መጻሕፍት ኦፊሰር መለየት አልተቻለም።',
  'Unable to load Library Officer settings.': 'የቤተ መጻሕፍት ኦፊሰር ቅንብሮችን መጫን አልተቻለም።',
  'The saved settings were not returned by the server.': 'አገልጋዩ የተቀመጡትን ቅንብሮች አልመለሰም።',
  'Settings saved successfully.': 'ቅንብሮቹ በተሳካ ሁኔታ ተቀምጠዋል።',
  'Unable to save settings.': 'ቅንብሮቹን ማስቀመጥ አልተቻለም።',
  'Not provided': 'አልተሰጠም',
  'Saving...': 'በማስቀመጥ ላይ...',
  'Loading Settings...': 'ቅንብሮችን በመጫን ላይ...',
};

export function LibraryLanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => (
    localStorage.getItem(LANGUAGE_KEY) === 'am' ? 'am' : 'en'
  ));

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (english) => language === 'am' ? (translations[english] || english) : english,
  }), [language]);

  return <LibraryLanguageContext.Provider value={value}>{children}</LibraryLanguageContext.Provider>;
}

export function useLibraryLanguage() {
  const context = useContext(LibraryLanguageContext);
  if (!context) throw new Error('useLibraryLanguage must be used inside LibraryLanguageProvider.');
  return context;
}
