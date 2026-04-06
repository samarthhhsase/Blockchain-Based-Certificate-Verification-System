import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  LANGUAGE_OPTIONS,
  SUPPORTED_LANGUAGES,
  getTranslationValue,
} from "../translations";

const STORAGE_KEY = "app_language";
const DEFAULT_LANGUAGE = "en";

const LanguageContext = createContext(null);

function getStoredLanguage() {
  const storedLanguage = localStorage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
}

function formatTranslation(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, token) => values?.[token] ?? `{${token}}`);
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => getStoredLanguage());

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = (nextLanguage) => {
    setLanguageState(SUPPORTED_LANGUAGES.includes(nextLanguage) ? nextLanguage : DEFAULT_LANGUAGE);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languageOptions: LANGUAGE_OPTIONS,
      t: (key, values) => formatTranslation(getTranslationValue(language, key), values),
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
