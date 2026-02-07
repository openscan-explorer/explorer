import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import ContractsSection from "./ContractsSection";
import DevelopmentSection from "./DevelopmentSection";
import SignaturesSection from "./SignaturesSection";
import TransactionsSection from "./TransactionsSection";
import UtilsSection from "./UtilsSection";
import "../../../styles/devtools.css";

const validSections = ["transactions", "signatures", "utils", "contracts", "development"];

const DevTools: React.FC = () => {
  const { t } = useTranslation("devtools");
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const sectionParam = searchParams.get("section") || "transactions";
  const [activeSection, setActiveSection] = useState(sectionParam);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newSection = params.get("section") || "transactions";
    setActiveSection(validSections.includes(newSection) ? newSection : "transactions");
  }, [location.search]);

  const tabs = [
    { name: "transactions", label: t("transactions") },
    { name: "signatures", label: t("signatures") },
    { name: "utils", label: t("utils") },
    { name: "contracts", label: t("contracts") },
    { name: "development", label: t("development") },
  ];

  const handleTabClick = (tabName: string) => {
    navigate(`/devtools?section=${tabName}`);
    setActiveSection(tabName);
  };

  return (
    <div className="container-wide">
      <div className="page-card devtools-content-wrapper">
        <h1 className="page-title-small text-center">{t("title")}</h1>

        {/* Mobile dropdown */}
        <div className="devtools-mobile-select">
          <select
            value={activeSection}
            onChange={(e) => handleTabClick(e.target.value)}
            className="devtools-section-select"
          >
            {tabs.map((tab) => (
              <option key={tab.name} value={tab.name}>
                {tab.label}
              </option>
            ))}
          </select>
          <span className="devtools-select-arrow">▼</span>
        </div>

        {/* Desktop tabs */}
        <div className="devtools-tabs">
          {tabs.map((tab) => (
            // biome-ignore lint/a11y/useButtonType: <TODO>
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab.name)}
              className={`devtools-tab ${activeSection === tab.name ? "active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="devtools-content">
          {activeSection === "transactions" && <TransactionsSection />}
          {activeSection === "signatures" && <SignaturesSection />}
          {activeSection === "utils" && <UtilsSection />}
          {activeSection === "contracts" && <ContractsSection />}
          {activeSection === "development" && <DevelopmentSection />}
        </div>
      </div>
    </div>
  );
};

export default DevTools;
