import { useContext } from 'react';
import HRLanguageContext from './hrLanguageContext';

export function useHRLanguage() {
  const context = useContext(HRLanguageContext);
  if (!context) throw new Error('useHRLanguage must be used inside HRLanguageProvider.');
  return context;
}

export function useOptionalHRLanguage() {
  const context = useContext(HRLanguageContext);
  return context || { language: 'en', t: (english) => english };
}
