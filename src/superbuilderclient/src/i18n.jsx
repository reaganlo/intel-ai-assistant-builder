import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import { invoke } from "@tauri-apps/api/core";

// System language mapping rules
const LANG_MAPPING = {
  // Simplified Chinese (merge Mainland China and Singapore)
  "zh-CN": "zh-Hans", // Mainland China
  "zh-SG": "zh-Hans", // Singapore
  "zh-Hans": "zh-Hans", // Generic Simplified Chinese
  // Traditional Chinese (merge Taiwan/Hong Kong/Macau)
  "zh-TW": "zh-Hant", // Taiwan
  "zh-HK": "zh-Hant", // Hong Kong
  "zh-MO": "zh-Hant", // Macau
  "zh-Hant": "zh-Hant", // Generic Traditional Chinese
  // Japanese
  "ja": "ja-JP", // Japanese
  "ja-JP": "ja-JP", // Japan
  // English
  en: "en",
};

// Supported languages configuration with display names
const SUPPORTED_LANGUAGES = [
  {
    code: "en",
    name: "English",
    nativeName: "English"
  },
  {
    code: "zh-Hans",
    name: "Simplified Chinese",
    nativeName: "简体中文"
  },
  {
    code: "zh-Hant",
    name: "Traditional Chinese", 
    nativeName: "繁體中文"
  },
  {
    code: "ja-JP",
    name: "Japanese",
    nativeName: "日本語"
  }
];

// Helper function to get system language display name
const getSystemLanguageLabel = (systemLng) => {
  if (!systemLng) return "System";
  
  if (systemLng.startsWith("zh")) {
    return "跟随系统";
  } else if (systemLng === "ja-JP") {
    return "システムに従う";
  }
  return "System";
};

const getSystemLanguage = async () => {
  try {
    const rawLang = await invoke("get_system_language");

    // Normalize language codes (e.g. zh-Hans-SG → zh-Hans)
    const normalizedLang =
      rawLang
        .replace(/-[a-zA-Z]+$/, "") // Remove regional suffix
        .split("-")[0] === "zh" // Special handling for Chinese
        ? rawLang.split("-").slice(0, 2).join("-")
        : rawLang.split("-")[0];

    return LANG_MAPPING[normalizedLang] || "en";
  } catch (error) {
    console.error("Language detection failed:", error);
    // Browser fallback strategy
    const browserLang = navigator.language;
    if (browserLang.startsWith("zh")) {
      return browserLang.includes("TW") ||
        browserLang.includes("HK") ||
        browserLang.includes("MO")
        ? "zh-Hant"
        : "zh-Hans";
    }
    if (browserLang.startsWith("ja")) {
      return "ja-JP";
    }
    return "en";
  }
};

const getSettingLanguage = async () => {
  let savedLng = localStorage.getItem("i18n-lng");

  // Legacy format compatibility handling
  if (savedLng === "zh") {
    savedLng = "zh-Hans"; // Convert legacy Chinese format to Simplified

    // Storing non-sensitive language preference in localStorage
    localStorage.setItem("i18n-lng", savedLng);
  }

  // Supported languages list
  const supportedLngs = SUPPORTED_LANGUAGES.map(lang => lang.code);
  if (supportedLngs.includes(savedLng)) {
    return savedLng;
  }

  // Get and map system language
  return await getSystemLanguage();
};

const initializeI18n = async (lng) => {
  const targetLng = lng || (await getSettingLanguage());

  return i18n
    .use(Backend)
    .use(initReactI18next)
    .init({
      lng: targetLng,
      fallbackLng: "en",
      supportedLngs: SUPPORTED_LANGUAGES.map(lang => lang.code),
      interpolation: {
        escapeValue: false,
      },
      backend: {
        // Load resources by language type (example directory structure)
        loadPath: "/locales/{{lng}}/{{ns}}.json",
      },
      react: {
        useSuspense: false,
      },
    });
};

export { getSystemLanguage, getSettingLanguage, initializeI18n, SUPPORTED_LANGUAGES, getSystemLanguageLabel };
