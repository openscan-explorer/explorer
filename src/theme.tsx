// theme/index.ts

import type { Theme } from "@rainbow-me/rainbowkit";

// ========== Color Tokens ==========
export const colors = {
  // Brand
  primary: "#10b981",
  primaryHover: "#34d399",
  primaryMuted: "#059669",
  secondary: "#ff6b4a",
  secondaryHover: "#ff8a70",

  // Semantic
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",

  // Dark Mode
  dark: {
    bgPrimary: "#1a1d26",
    bgSecondary: "#242833",
    bgTertiary: "#2e3340",
    textPrimary: "#ffffff",
    textSecondary: "#8a8f98",
    textTertiary: "#5c6370",
    border: "#2e3340",
    borderSecondary: "#3a3f4b",
  },

  // Light Mode
  light: {
    bgPrimary: "#f5f7fa",
    bgSecondary: "#ffffff",
    bgTertiary: "#e5e7eb",
    textPrimary: "#1a1d26",
    textSecondary: "#6b7280",
    textTertiary: "#9ca3af",
    border: "#e5e7eb",
    borderSecondary: "#d1d5db",
  },
} as const;

// ========== CSS Variables ==========
export const cssVariables = `
:root {
  /* Brand */
  --color-primary: ${colors.primary};
  --color-primary-hover: ${colors.primaryHover};
  --color-primary-muted: ${colors.primaryMuted};
  --color-primary-subtle: rgba(16, 185, 129, 0.1);
  --color-secondary: ${colors.secondary};
  --color-secondary-hover: ${colors.secondaryHover};
  --color-secondary-subtle: rgba(255, 107, 74, 0.1);

  /* Semantic */
  --color-success: ${colors.success};
  --color-success-hover: #34d399;
  --color-success-subtle: rgba(16, 185, 129, 0.1);
  --color-warning: ${colors.warning};
  --color-warning-hover: #fbbf24;
  --color-warning-subtle: rgba(245, 158, 11, 0.1);
  --color-error: ${colors.error};
  --color-error-hover: #f87171;
  --color-error-subtle: rgba(239, 68, 68, 0.1);
  --color-info: ${colors.info};
  --color-info-hover: #60a5fa;
  --color-info-subtle: rgba(59, 130, 246, 0.1);

  /* Dark Mode (default) */
  --bg-primary: ${colors.dark.bgPrimary};
  --bg-secondary: ${colors.dark.bgSecondary};
  --bg-tertiary: ${colors.dark.bgTertiary};
  --bg-card: ${colors.dark.bgSecondary};
  --bg-card-hover: ${colors.dark.bgTertiary};
  --bg-input: ${colors.dark.bgPrimary};
  --bg-tooltip: #3a3f4b;
  --bg-modal-overlay: rgba(0, 0, 0, 0.6);

  --text-primary: ${colors.dark.textPrimary};
  --text-secondary: ${colors.dark.textSecondary};
  --text-tertiary: ${colors.dark.textTertiary};
  --text-disabled: #4a4f5a;
  --text-inverse: ${colors.dark.bgPrimary};
  --text-link: ${colors.primary};
  --text-link-hover: ${colors.primaryHover};

  --border-primary: ${colors.dark.border};
  --border-secondary: ${colors.dark.borderSecondary};
  --border-focus: ${colors.primary};

  /* Buttons */
  --btn-primary-bg: ${colors.primary};
  --btn-primary-bg-hover: ${colors.primaryMuted};
  --btn-primary-text: #ffffff;
  --btn-secondary-bg: transparent;
  --btn-secondary-bg-hover: rgba(16, 185, 129, 0.1);
  --btn-secondary-text: ${colors.primary};
  --btn-secondary-border: ${colors.primary};
  --btn-disabled-bg: ${colors.dark.bgTertiary};
  --btn-disabled-text: #5c6370;

  /* Inputs */
  --input-bg: ${colors.dark.bgPrimary};
  --input-border: ${colors.dark.border};
  --input-border-focus: ${colors.primary};
  --input-text: #ffffff;
  --input-placeholder: #5c6370;

  /* Tables */
  --table-header-bg: ${colors.dark.bgSecondary};
  --table-row-bg: transparent;
  --table-row-bg-hover: ${colors.dark.bgTertiary};
  --table-border: ${colors.dark.border};

  /* Badges */
  --badge-success-bg: rgba(16, 185, 129, 0.15);
  --badge-success-text: #34d399;
  --badge-warning-bg: rgba(245, 158, 11, 0.15);
  --badge-warning-text: #fbbf24;
  --badge-error-bg: rgba(239, 68, 68, 0.15);
  --badge-error-text: #f87171;
  --badge-info-bg: rgba(59, 130, 246, 0.15);
  --badge-info-text: #60a5fa;
  --badge-neutral-bg: ${colors.dark.bgTertiary};
  --badge-neutral-text: ${colors.dark.textSecondary};

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);

  /* Scrollbar */
  --scrollbar-track: ${colors.dark.bgPrimary};
  --scrollbar-thumb: #3a3f4b;
  --scrollbar-thumb-hover: #4a4f5a;

  /* Primary Alpha Variants */
  --color-primary-alpha-2: rgba(16, 185, 129, 0.02);
  --color-primary-alpha-4: rgba(16, 185, 129, 0.04);
  --color-primary-alpha-6: rgba(16, 185, 129, 0.06);
  --color-primary-alpha-8: rgba(16, 185, 129, 0.08);
  --color-primary-alpha-10: rgba(16, 185, 129, 0.1);
  --color-primary-alpha-15: rgba(16, 185, 129, 0.15);
  --color-primary-alpha-20: rgba(16, 185, 129, 0.2);
  --color-primary-alpha-25: rgba(16, 185, 129, 0.25);
  --color-primary-alpha-30: rgba(16, 185, 129, 0.3);
  --color-primary-alpha-40: rgba(16, 185, 129, 0.4);
  --color-primary-alpha-50: rgba(16, 185, 129, 0.5);

  /* Semantic Alpha Variants */
  --color-error-alpha-4: rgba(239, 68, 68, 0.04);
  --color-error-alpha-10: rgba(239, 68, 68, 0.1);
  --color-error-alpha-15: rgba(239, 68, 68, 0.15);
  --color-error-alpha-20: rgba(239, 68, 68, 0.2);
  --color-error-alpha-30: rgba(239, 68, 68, 0.3);
  --color-warning-alpha-4: rgba(245, 158, 11, 0.04);
  --color-warning-alpha-10: rgba(245, 158, 11, 0.1);
  --color-warning-alpha-15: rgba(245, 158, 11, 0.15);
  --color-warning-alpha-30: rgba(245, 158, 11, 0.3);
  --color-warning-alpha-50: rgba(245, 158, 11, 0.5);
  --color-info-alpha-4: rgba(59, 130, 246, 0.04);
  --color-info-alpha-10: rgba(59, 130, 246, 0.1);
  --color-info-alpha-15: rgba(59, 130, 246, 0.15);
  --color-info-alpha-20: rgba(59, 130, 246, 0.2);
  --color-info-alpha-30: rgba(59, 130, 246, 0.3);

  /* Overlay Utilities (for dark theme - light overlays on dark bg) */
  --overlay-light-2: rgba(255, 255, 255, 0.02);
  --overlay-light-3: rgba(255, 255, 255, 0.03);
  --overlay-light-5: rgba(255, 255, 255, 0.05);
  --overlay-light-10: rgba(255, 255, 255, 0.1);
  --overlay-light-15: rgba(255, 255, 255, 0.15);
  --overlay-light-20: rgba(255, 255, 255, 0.2);
  --overlay-dark-5: rgba(0, 0, 0, 0.05);
  --overlay-dark-10: rgba(0, 0, 0, 0.1);
  --overlay-dark-20: rgba(0, 0, 0, 0.2);
  --overlay-dark-40: rgba(0, 0, 0, 0.4);
  --overlay-dark-60: rgba(0, 0, 0, 0.6);
  --overlay-dark-80: rgba(0, 0, 0, 0.8);
}

[data-theme="light"] {
  --color-primary-hover: ${colors.primaryMuted};
  --color-primary-subtle: rgba(16, 185, 129, 0.08);
  --color-secondary-hover: #e55a3a;
  --color-secondary-subtle: rgba(255, 107, 74, 0.08);

  --color-success-hover: ${colors.primaryMuted};
  --color-success-subtle: rgba(16, 185, 129, 0.08);
  --color-warning-hover: #d97706;
  --color-warning-subtle: rgba(245, 158, 11, 0.08);
  --color-error-hover: #dc2626;
  --color-error-subtle: rgba(239, 68, 68, 0.08);
  --color-info-hover: #2563eb;
  --color-info-subtle: rgba(59, 130, 246, 0.08);

  --bg-primary: ${colors.light.bgPrimary};
  --bg-secondary: ${colors.light.bgSecondary};
  --bg-tertiary: ${colors.light.bgTertiary};
  --bg-card: ${colors.light.bgSecondary};
  --bg-card-hover: #f9fafb;
  --bg-input: ${colors.light.bgSecondary};
  --bg-tooltip: ${colors.dark.bgPrimary};
  --bg-modal-overlay: rgba(0, 0, 0, 0.4);

  --text-primary: ${colors.light.textPrimary};
  --text-secondary: ${colors.light.textSecondary};
  --text-tertiary: ${colors.light.textTertiary};
  --text-disabled: #d1d5db;
  --text-inverse: #ffffff;
  --text-link: ${colors.primaryMuted};
  --text-link-hover: ${colors.primary};

  --border-primary: ${colors.light.border};
  --border-secondary: ${colors.light.borderSecondary};

  --btn-primary-bg-hover: ${colors.primaryHover};
  --btn-secondary-bg-hover: rgba(16, 185, 129, 0.08);
  --btn-disabled-bg: ${colors.light.bgTertiary};
  --btn-disabled-text: ${colors.light.textTertiary};

  --input-bg: ${colors.light.bgSecondary};
  --input-border: ${colors.light.borderSecondary};
  --input-placeholder: ${colors.light.textTertiary};

  --table-header-bg: #f9fafb;
  --table-row-bg-hover: ${colors.light.bgPrimary};
  --table-border: ${colors.light.border};

  --badge-success-bg: rgba(16, 185, 129, 0.1);
  --badge-success-text: ${colors.primaryMuted};
  --badge-warning-bg: rgba(245, 158, 11, 0.1);
  --badge-warning-text: #d97706;
  --badge-error-bg: rgba(239, 68, 68, 0.1);
  --badge-error-text: #dc2626;
  --badge-info-bg: rgba(59, 130, 246, 0.1);
  --badge-info-text: #2563eb;
  --badge-neutral-bg: ${colors.light.bgTertiary};
  --badge-neutral-text: ${colors.light.textSecondary};

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  --scrollbar-track: ${colors.light.bgPrimary};
  --scrollbar-thumb: ${colors.light.borderSecondary};
  --scrollbar-thumb-hover: ${colors.light.textTertiary};

  /* Overlay Utilities (for light theme - dark overlays on light bg) */
  --overlay-light-2: rgba(0, 0, 0, 0.02);
  --overlay-light-3: rgba(0, 0, 0, 0.03);
  --overlay-light-5: rgba(0, 0, 0, 0.03);
  --overlay-light-10: rgba(0, 0, 0, 0.05);
  --overlay-light-15: rgba(0, 0, 0, 0.08);
  --overlay-light-20: rgba(0, 0, 0, 0.1);
  --overlay-dark-5: rgba(0, 0, 0, 0.03);
  --overlay-dark-10: rgba(0, 0, 0, 0.05);
  --overlay-dark-20: rgba(0, 0, 0, 0.1);
  --overlay-dark-40: rgba(0, 0, 0, 0.2);
  --overlay-dark-60: rgba(0, 0, 0, 0.3);
  --overlay-dark-80: rgba(0, 0, 0, 0.5);
}
`;

// ========== RainbowKit Themes ==========
export const rainbowkitDarkTheme: Theme = {
  blurs: {
    modalOverlay: "blur(4px)",
  },
  colors: {
    accentColor: colors.primary,
    accentColorForeground: "#ffffff",
    actionButtonBorder: colors.dark.border,
    actionButtonBorderMobile: colors.dark.border,
    actionButtonSecondaryBackground: colors.dark.bgSecondary,
    closeButton: colors.dark.textSecondary,
    closeButtonBackground: colors.dark.bgTertiary,
    connectButtonBackground: colors.primary,
    connectButtonBackgroundError: colors.error,
    connectButtonInnerBackground: colors.dark.bgSecondary,
    connectButtonText: "#ffffff",
    connectButtonTextError: "#ffffff",
    connectionIndicator: colors.success,
    downloadBottomCardBackground: colors.dark.bgPrimary,
    downloadTopCardBackground: colors.dark.bgSecondary,
    error: colors.error,
    generalBorder: colors.dark.border,
    generalBorderDim: colors.dark.bgSecondary,
    menuItemBackground: colors.dark.bgTertiary,
    modalBackdrop: "rgba(0, 0, 0, 0.6)",
    modalBackground: colors.dark.bgPrimary,
    modalBorder: colors.dark.border,
    modalText: colors.dark.textPrimary,
    modalTextDim: colors.dark.textSecondary,
    modalTextSecondary: colors.dark.textSecondary,
    profileAction: colors.dark.bgSecondary,
    profileActionHover: colors.dark.bgTertiary,
    profileForeground: colors.dark.bgSecondary,
    selectedOptionBorder: colors.primary,
    standby: colors.warning,
  },
  fonts: {
    body: "inherit",
  },
  radii: {
    actionButton: "8px",
    connectButton: "8px",
    menuButton: "8px",
    modal: "12px",
    modalMobile: "12px",
  },
  shadows: {
    connectButton: "0 4px 6px rgba(0, 0, 0, 0.4)",
    dialog: "0 10px 15px rgba(0, 0, 0, 0.5)",
    profileDetailsAction: "0 2px 4px rgba(0, 0, 0, 0.3)",
    selectedOption: `0 0 0 2px ${colors.primary}`,
    selectedWallet: `0 0 0 2px ${colors.primary}`,
    walletLogo: "0 2px 4px rgba(0, 0, 0, 0.3)",
  },
};

export const rainbowkitLightTheme: Theme = {
  blurs: {
    modalOverlay: "blur(4px)",
  },
  colors: {
    accentColor: colors.primary,
    accentColorForeground: "#ffffff",
    actionButtonBorder: colors.light.border,
    actionButtonBorderMobile: colors.light.border,
    actionButtonSecondaryBackground: colors.light.bgPrimary,
    closeButton: colors.light.textSecondary,
    closeButtonBackground: colors.light.bgTertiary,
    connectButtonBackground: colors.primary,
    connectButtonBackgroundError: colors.error,
    connectButtonInnerBackground: colors.light.bgSecondary,
    connectButtonText: "#ffffff",
    connectButtonTextError: "#ffffff",
    connectionIndicator: colors.success,
    downloadBottomCardBackground: colors.light.bgPrimary,
    downloadTopCardBackground: colors.light.bgSecondary,
    error: colors.error,
    generalBorder: colors.light.border,
    generalBorderDim: colors.light.bgPrimary,
    menuItemBackground: colors.light.bgPrimary,
    modalBackdrop: "rgba(0, 0, 0, 0.4)",
    modalBackground: colors.light.bgSecondary,
    modalBorder: colors.light.border,
    modalText: colors.light.textPrimary,
    modalTextDim: colors.light.textSecondary,
    modalTextSecondary: colors.light.textSecondary,
    profileAction: colors.light.bgPrimary,
    profileActionHover: colors.light.bgTertiary,
    profileForeground: colors.light.bgPrimary,
    selectedOptionBorder: colors.primary,
    standby: colors.warning,
  },
  fonts: {
    body: "inherit",
  },
  radii: {
    actionButton: "8px",
    connectButton: "8px",
    menuButton: "8px",
    modal: "12px",
    modalMobile: "12px",
  },
  shadows: {
    connectButton: "0 4px 6px rgba(0, 0, 0, 0.07)",
    dialog: "0 10px 15px rgba(0, 0, 0, 0.1)",
    profileDetailsAction: "0 2px 4px rgba(0, 0, 0, 0.05)",
    selectedOption: `0 0 0 2px ${colors.primary}`,
    selectedWallet: `0 0 0 2px ${colors.primary}`,
    walletLogo: "0 2px 4px rgba(0, 0, 0, 0.05)",
  },
};

// ========== Theme Hook ==========
export function getRainbowKitTheme(isDark: boolean): Theme {
  return isDark ? rainbowkitDarkTheme : rainbowkitLightTheme;
}
