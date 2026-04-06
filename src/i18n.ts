import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAddress from "./locales/en/address.json";
import enBlock from "./locales/en/block.json";
import enCommon from "./locales/en/common.json";
import enDevtools from "./locales/en/devtools.json";
import enHome from "./locales/en/home.json";
import enNetwork from "./locales/en/network.json";
import enSettings from "./locales/en/settings.json";
import enSolana from "./locales/en/solana.json";
import enTransaction from "./locales/en/transaction.json";
import enTokenDetails from "./locales/en/tokenDetails.json";
import enRpcs from "./locales/en/rpcs.json";
import enTooltips from "./locales/en/tooltips.json";

import esAddress from "./locales/es/address.json";
import esBlock from "./locales/es/block.json";
import esCommon from "./locales/es/common.json";
import esDevtools from "./locales/es/devtools.json";
import esHome from "./locales/es/home.json";
import esNetwork from "./locales/es/network.json";
import esSettings from "./locales/es/settings.json";
import esSolana from "./locales/es/solana.json";
import esTransaction from "./locales/es/transaction.json";
import esTokenDetails from "./locales/es/tokenDetails.json";
import esRpcs from "./locales/es/rpcs.json";
import esTooltips from "./locales/es/tooltips.json";

import zhAddress from "./locales/zh/address.json";
import zhBlock from "./locales/zh/block.json";
import zhCommon from "./locales/zh/common.json";
import zhDevtools from "./locales/zh/devtools.json";
import zhHome from "./locales/zh/home.json";
import zhNetwork from "./locales/zh/network.json";
import zhSettings from "./locales/zh/settings.json";
import zhSolana from "./locales/zh/solana.json";
import zhTransaction from "./locales/zh/transaction.json";
import zhTokenDetails from "./locales/zh/tokenDetails.json";
import zhTooltips from "./locales/zh/tooltips.json";

import jaAddress from "./locales/ja/address.json";
import jaBlock from "./locales/ja/block.json";
import jaCommon from "./locales/ja/common.json";
import jaDevtools from "./locales/ja/devtools.json";
import jaHome from "./locales/ja/home.json";
import jaNetwork from "./locales/ja/network.json";
import jaSettings from "./locales/ja/settings.json";
import jaSolana from "./locales/ja/solana.json";
import jaTransaction from "./locales/ja/transaction.json";
import jaTokenDetails from "./locales/ja/tokenDetails.json";
import jaTooltips from "./locales/ja/tooltips.json";

import ptBRAddress from "./locales/pt-BR/address.json";
import ptBRBlock from "./locales/pt-BR/block.json";
import ptBRCommon from "./locales/pt-BR/common.json";
import ptBRDevtools from "./locales/pt-BR/devtools.json";
import ptBRHome from "./locales/pt-BR/home.json";
import ptBRNetwork from "./locales/pt-BR/network.json";
import ptBRSettings from "./locales/pt-BR/settings.json";
import ptBRSolana from "./locales/pt-BR/solana.json";
import ptBRTransaction from "./locales/pt-BR/transaction.json";
import ptBRTokenDetails from "./locales/pt-BR/tokenDetails.json";
import ptBRTooltips from "./locales/pt-BR/tooltips.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "zh", name: "简体中文" },
  { code: "ja", name: "日本語" },
  { code: "pt-BR", name: "Português (Brasil)" },
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
        tokenDetails: enTokenDetails,
        rpcs: enRpcs,
        tooltips: enTooltips,
        solana: enSolana,
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
        tokenDetails: esTokenDetails,
        rpcs: esRpcs,
        tooltips: esTooltips,
        solana: esSolana,
      },
      zh: {
        common: zhCommon,
        home: zhHome,
        settings: zhSettings,
        address: zhAddress,
        block: zhBlock,
        transaction: zhTransaction,
        devtools: zhDevtools,
        network: zhNetwork,
        tokenDetails: zhTokenDetails,
        tooltips: zhTooltips,
        solana: zhSolana,
      },
      ja: {
        common: jaCommon,
        home: jaHome,
        settings: jaSettings,
        address: jaAddress,
        block: jaBlock,
        transaction: jaTransaction,
        devtools: jaDevtools,
        network: jaNetwork,
        tokenDetails: jaTokenDetails,
        tooltips: jaTooltips,
        solana: jaSolana,
      },
      "pt-BR": {
        common: ptBRCommon,
        home: ptBRHome,
        settings: ptBRSettings,
        address: ptBRAddress,
        block: ptBRBlock,
        transaction: ptBRTransaction,
        devtools: ptBRDevtools,
        network: ptBRNetwork,
        tokenDetails: ptBRTokenDetails,
        tooltips: ptBRTooltips,
        solana: ptBRSolana,
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
      "rpcs",
      "tooltips",
      "solana",
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
