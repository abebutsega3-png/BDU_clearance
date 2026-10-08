import React, { useMemo, useState } from 'react';
import { getICTOfficerSettings, saveICTOfficerSettings } from './ICTSettings';
import { ICTLanguageContext } from './ICTLanguageContext';

export function ICTLanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => (
    getICTOfficerSettings().appearance.language === 'Amharic' ? 'am' : 'en'
  ));

  const setLanguage = (nextLanguage) => {
    const languageName = nextLanguage === 'am' ? 'Amharic' : 'English';
    const settings = getICTOfficerSettings();
    saveICTOfficerSettings({
      ...settings,
      appearance: { ...settings.appearance, language: languageName },
    });
    setLanguageState(nextLanguage);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (english, amharic) => language === 'am' ? amharic : english,
  }), [language]);

  return <ICTLanguageContext.Provider value={value}>{children}</ICTLanguageContext.Provider>;
}
