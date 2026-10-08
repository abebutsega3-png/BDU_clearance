import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PropertyLanguageContext = createContext(null);
const LANGUAGE_KEY = 'property-officer-language';

export function PropertyLanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => (
    localStorage.getItem(LANGUAGE_KEY) === 'am' ? 'am' : 'en'
  ));

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (english, amharic) => language === 'am' && amharic ? amharic : english,
  }), [language]);

  return <PropertyLanguageContext.Provider value={value}>{children}</PropertyLanguageContext.Provider>;
}

export function usePropertyLanguage() {
  const context = useContext(PropertyLanguageContext);
  if (!context) throw new Error('usePropertyLanguage must be used inside PropertyLanguageProvider.');
  return context;
}
