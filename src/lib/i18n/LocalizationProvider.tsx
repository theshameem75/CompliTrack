import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { blocksClient } from "../blocks/client";
import { defaultDictionary } from "./dictionary";
import type { TranslationKey } from "./dictionary";

type Dictionary = Record<string, string>;
type LocalizationValue = { language: string; setLanguage: (language: string) => void; t: (key: TranslationKey, fallback?: string) => string };

const LocalizationContext = createContext<LocalizationValue | undefined>(undefined);
const LANGUAGE_KEY = "blocks-app:language";
const MODULES = ["common", "dashboard", "compliance"];

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "en-US");
  const [cloudDictionary, setCloudDictionary] = useState<Dictionary>({});

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    blocksClient.localization.load(language, MODULES)
      .then(setCloudDictionary)
      .catch(() => setCloudDictionary({}));
  }, [language]);

  const value = useMemo<LocalizationValue>(() => ({
    language,
    setLanguage: setLanguageState,
    t: (key, fallback) => cloudDictionary[key] ?? defaultDictionary[key] ?? fallback ?? key
  }), [cloudDictionary, language]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useT() {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error("useT must be used within LocalizationProvider");
  return context;
}
