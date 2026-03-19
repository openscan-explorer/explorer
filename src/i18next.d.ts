import type address from "./locales/en/address.json";
import type block from "./locales/en/block.json";
import type common from "./locales/en/common.json";
import type devtools from "./locales/en/devtools.json";
import type home from "./locales/en/home.json";
import type network from "./locales/en/network.json";
import type settings from "./locales/en/settings.json";
import type transaction from "./locales/en/transaction.json";
import type tokenDetails from "./locales/en/tokenDetails.json";
import type rpcs from "./locales/en/rpcs.json";
import type tooltips from "./locales/en/tooltips.json";
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      home: typeof home;
      settings: typeof settings;
      address: typeof address;
      block: typeof block;
      transaction: typeof transaction;
      devtools: typeof devtools;
      network: typeof network;
      tokenDetails: typeof tokenDetails;
      rpcs: typeof rpcs;
      tooltips: typeof tooltips;
    };
  }
}
