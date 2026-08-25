import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { blocksClient } from "../blocks/client";
import { defaultDictionary } from "./dictionary";
import type { TranslationKey } from "./dictionary";
import { germanDictionary } from "./de";

type Dictionary = Record<string, string>;
type CloudDictionary = { language: string; values: Dictionary };
type LocalizationValue = { language: string; setLanguage: (language: string) => void; t: (key: TranslationKey, fallback?: string) => string };

const LocalizationContext = createContext<LocalizationValue | undefined>(undefined);
const LANGUAGE_KEY = "blocks-app:language";
const MODULES = ["common", "dashboard", "compliance", "assets"];

function normalizeLanguage(language: string) {
  return language.toLowerCase().startsWith("de") ? "de-DE" : "en-US";
}

function cloudTranslation(values: Dictionary, key: TranslationKey) {
  const value = values[key]?.trim();
  if (!value || value === key) return undefined;

  // Blocks can return a display sentinel for keys that have not been
  // published yet. Treat it as absent so the bundled dictionary remains the
  // reliable offline/first-paint fallback.
  const normalized = value.replace(/[\[\]\s_-]/g, "").toLowerCase();
  if (["keymissing", "missingkey", "keynotfound", "translationmissing", "translationnotfound"].includes(normalized)) return undefined;
  return value;
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(() => normalizeLanguage(localStorage.getItem(LANGUAGE_KEY) || navigator.language));
  const [cloudDictionary, setCloudDictionary] = useState<CloudDictionary>({ language: "", values: {} });

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    let active = true;
    blocksClient.localization.load(language, MODULES)
      .then((values) => { if (active) setCloudDictionary({ language, values }); })
      .catch(() => { if (active) setCloudDictionary({ language, values: {} }); });
    return () => { active = false; };
  }, [language]);

  const setLanguage = useCallback((nextLanguage: string) => setLanguageState(normalizeLanguage(nextLanguage)), []);

  const value = useMemo<LocalizationValue>(() => ({
    language,
    setLanguage,
    t: (key, fallback) => (cloudDictionary.language === language ? cloudTranslation(cloudDictionary.values, key) : undefined) ?? (language === "de-DE" ? germanDictionary[key] : undefined) ?? defaultDictionary[key] ?? fallback ?? key
  }), [cloudDictionary, language, setLanguage]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useT() {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error("useT must be used within LocalizationProvider");
  return context;
}
