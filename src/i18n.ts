import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAddress from "./locales/en/address.json";
import enBlock from "./locales/en/block.json";
import enCommon from "./locales/en/common.json";
import enDevtools from "./locales/en/devtools.json";
import enErrors from "./locales/en/errors.json";
import enHome from "./locales/en/home.json";
import enNetwork from "./locales/en/network.json";
import enSettings from "./locales/en/settings.json";
import enTransaction from "./locales/en/transaction.json";
import enTokenDetails from "./locales/en/tokenDetails.json";

import esAddress from "./locales/es/address.json";
import esBlock from "./locales/es/block.json";
import esCommon from "./locales/es/common.json";
import esDevtools from "./locales/es/devtools.json";
import esErrors from "./locales/es/errors.json";
import esHome from "./locales/es/home.json";
import esNetwork from "./locales/es/network.json";
import esSettings from "./locales/es/settings.json";
import esTransaction from "./locales/es/transaction.json";
import esTokenDetails from "./locales/es/tokenDetails.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        home: enHome,
        settings: enSettings,
        address: enAddress,
        block: enBlock,
        transaction: enTransaction,
        devtools: enDevtools,
        network: enNetwork,
        errors: enErrors,
        tokenDetails: enTokenDetails,
      },
      es: {
        common: esCommon,
        home: esHome,
        settings: esSettings,
        address: esAddress,
        block: esBlock,
        transaction: esTransaction,
        devtools: esDevtools,
        network: esNetwork,
        errors: esErrors,
        tokenDetails: esTokenDetails,
      },
    },
    fallbackLng: "en",
    defaultNS: "common",
    ns: [
      "common",
      "home",
      "settings",
      "address",
      "block",
      "transaction",
      "devtools",
      "network",
      "errors",
    ],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "openScan_language",
      caches: ["localStorage"],
    },
  });

export default i18n;
