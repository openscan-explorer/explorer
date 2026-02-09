import type React from "react";
import { useTranslation } from "react-i18next";

const Contact: React.FC = () => {
  const { t } = useTranslation();
  const xmtpDmLink = "https://xmtp.chat/production/dm/0x08EEc580AD41e9994599BaD7d2a74A9874A2852c";

  return (
    <div className="container-medium page-container-padded">
      <div className="page-card">
        {/* Header */}
        <div className="text-center mb-large">
          <h1 className="page-heading">{t("contact.title")}</h1>
          <p className="page-subtitle">{t("contact.subtitle")}</p>
        </div>

        {/* XMTP Section */}
        <div className="about-section">
          <div className="text-center mb-large opensource-card">
            <h2 className="opensource-title">{t("contact.xmtpTitle")}</h2>
            <p className="opensource-description">{t("contact.xmtpDescription")}</p>
            <a
              href={xmtpDmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="button-primary-inline"
            >
              {t("contact.sendMessage")}
            </a>
          </div>
        </div>

        {/* What is XMTP */}
        <div className="about-section">
          <h2 className="page-heading-large text-center">{t("contact.whatIsXmtp")}</h2>
          <div className="data-grid-2 mb-large">
            <div className="feature-card text-center">
              <h3 className="feature-card-title">{t("contact.walletMessaging")}</h3>
              <p className="feature-card-description">{t("contact.walletMessagingDescription")}</p>
            </div>
            <div className="feature-card text-center">
              <h3 className="feature-card-title">{t("contact.endToEnd")}</h3>
              <p className="feature-card-description">{t("contact.endToEndDescription")}</p>
            </div>
            <div className="feature-card text-center">
              <h3 className="feature-card-title">{t("contact.decentralized")}</h3>
              <p className="feature-card-description">{t("contact.decentralizedDescription")}</p>
            </div>
            <div className="feature-card text-center">
              <h3 className="feature-card-title">{t("contact.interoperable")}</h3>
              <p className="feature-card-description">{t("contact.interoperableDescription")}</p>
            </div>
          </div>
        </div>

        {/* Alternative Contact */}
        <div className="text-center mb-large">
          <p className="about-section-intro">
            {t("contact.alsoReachUs")}{" "}
            <a
              href="https://x.com/openscan_eth"
              target="_blank"
              rel="noopener noreferrer"
              className="link-primary"
            >
              {t("contact.xTwitter")}
            </a>{" "}
            {t("contact.orOpenIssue")}{" "}
            <a
              href="https://github.com/openscan-explorer/explorer/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="link-primary"
            >
              {t("contact.github")}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
