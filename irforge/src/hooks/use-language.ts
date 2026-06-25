import { useState, useCallback, useEffect } from "react";

export type Lang = "fa" | "en";

const STORAGE_KEY = "irforge_lang";

function applyLang(lang: Lang) {
  const html = document.documentElement;
  html.setAttribute("lang", lang);
  html.setAttribute("dir", lang === "fa" ? "rtl" : "ltr");
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (_) {}
}

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      return stored === "en" ? "en" : "fa";
    } catch (_) {
      return "fa";
    }
  });

  // اعمال زبان اولیه در mount
  useEffect(() => {
    applyLang(lang);
  }, []);

  const setLang = useCallback((next: Lang) => {
    applyLang(next);
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "fa" ? "en" : "fa");
  }, [lang, setLang]);

  return { lang, setLang, toggleLang, isRtl: lang === "fa" };
}
