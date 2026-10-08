import { createContext, useContext } from 'react';

export const ICTLanguageContext = createContext(null);

export function useICTLanguage() {
  const context = useContext(ICTLanguageContext);
  if (!context) throw new Error('useICTLanguage must be used inside ICTLanguageProvider.');
  return context;
}
