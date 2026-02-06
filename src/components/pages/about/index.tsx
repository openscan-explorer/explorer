import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getEnabledNetworks } from "../../../config/networks";
import NetworkIcon from "../../common/NetworkIcon";

interface GitHubStats {
  commits: number | null;
  contributors: number | null;
}

const About: React.FC = () => {
  const { t } = useTranslation();
  const appVersion = process.env.REACT_APP_VERSION || "0.1.0";
  const commitHash = process.env.REACT_APP_COMMIT_HASH || "development";
  const formattedCommitHash = commitHash.length > 7 ? commitHash.substring(0, 7) : commitHash;

  const [githubStats, setGithubStats] = useState<GitHubStats>({
    commits: null,
    contributors: null,
  });

  useEffect(() => {
    const fetchGitHubStats = async () => {
      try {
        const contributorsRes = await fetch(
          "https://api.github.com/repos/openscan-explorer/explorer/contributors?per_page=1",
        );
        if (contributorsRes.ok) {
          const linkHeader = contributorsRes.headers.get("Link");
          if (linkHeader) {
            const match = linkHeader.match(/page=(\d+)>; rel="last"/);
            const lastPage = match?.[1];
            if (lastPage) {
              setGithubStats((prev) => ({ ...prev, contributors: parseInt(lastPage, 10) }));
            }
          } else {
            const contributors = await contributorsRes.json();
            setGithubStats((prev) => ({ ...prev, contributors: contributors.length }));
          }
        }

        const repoRes = await fetch(
          "https://api.github.com/repos/openscan-explorer/explorer/commits?per_page=1",
        );
        if (repoRes.ok) {
          const linkHeader = repoRes.headers.get("Link");
          if (linkHeader) {
            const match = linkHeader.match(/page=(\d+)>; rel="last"/);
            const lastPage = match?.[1];
            if (lastPage) {
              setGithubStats((prev) => ({ ...prev, commits: parseInt(lastPage, 10) }));
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch GitHub stats:", error);
      }
    };

    fetchGitHubStats();
  }, []);

  const corePrinciples = [
    {
      title: t("about.freeOpenSource"),
      description: t("about.freeOpenSourceDescription"),
    },
    {
      title: t("about.privacyFirst"),
      description: t("about.privacyFirstDescription"),
    },
    {
      title: t("about.trustlessByDesign"),
      description: t("about.trustlessByDesignDescription"),
    },
    {
      title: t("about.publicInfrastructure"),
      description: t("about.publicInfrastructureDescription"),
    },
  ];

  const features = [
    {
      title: t("about.multiChainExplorer"),
      description: t("about.multiChainExplorerDescription"),
    },
    {
      title: t("about.contractInteraction"),
      description: t("about.contractInteractionDescription"),
    },
    {
      title: t("about.localDevelopment"),
      description: t("about.localDevelopmentDescription"),
    },
    {
      title: t("about.rpcTransparency"),
      description: t("about.rpcTransparencyDescription"),
    },
  ];

  const networks = getEnabledNetworks();

  return (
    <div className="container-medium page-container-padded">
      <div className="page-card">
        {/* Header */}
        <div className="text-center mb-large">
          <h1 className="page-heading">{t("about.heading")}</h1>
          <p className="page-subtitle">{t("about.subtitle")}</p>
        </div>

        {/* Mission Statement */}
        <div className="about-section">
          <p className="about-section-intro">{t("about.missionStatement")}</p>
        </div>

        {/* Core Principles */}
        <div className="about-section">
          <h2 className="page-heading-large text-center">{t("about.principles")}</h2>
          <div className="data-grid-2 mb-large">
            {corePrinciples.map((principle) => (
              <div key={principle.title} className="feature-card text-center">
                <h3 className="feature-card-title">{principle.title}</h3>
                <p className="feature-card-description">{principle.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="about-section">
          <h2 className="page-heading-large text-center">{t("about.features")}</h2>
          <div className="data-grid-2 mb-large">
            {features.map((feature) => (
              <div key={feature.title} className="feature-card text-center">
                <h3 className="feature-card-title">{feature.title}</h3>
                <p className="feature-card-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Supported Networks */}
        <h2 className="page-heading-large text-center">{t("about.supportedNetworks")}</h2>
        <div className="data-grid-3-centered mb-large">
          {networks.map((network) => (
            <div key={network.networkId} className="network-item text-center">
              <div className="network-info">
                <NetworkIcon network={network} size={32} />
                <div className="network-name">{network.name}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Open Source */}
        <div className="text-center mb-large opensource-card">
          <h2 className="opensource-title">{t("about.openSource")}</h2>
          <p className="opensource-description">{t("about.openSourceDescription")}</p>
          <a
            href="https://github.com/openscan-explorer/explorer"
            target="_blank"
            rel="noopener noreferrer"
            className="button-primary-inline"
          >
            {t("about.viewOnGithub")}
          </a>
        </div>

        {/* Version Info */}
        <div className="version-card">
          <div className="version-card-grid-4 text-center">
            <div className="version-info-item">
              <div className="version-info-label">{t("about.version")}</div>
              <div className="version-info-value">{appVersion}</div>
            </div>
            <div className="version-info-item">
              <div className="version-info-label">{t("about.commit")}</div>
              <div className="version-info-value-mono">{formattedCommitHash}</div>
            </div>
            <div className="version-info-item">
              <div className="version-info-label">{t("about.totalCommits")}</div>
              <div className="version-info-value">
                {githubStats.commits !== null ? githubStats.commits.toLocaleString() : "—"}
              </div>
            </div>
            <div className="version-info-item">
              <div className="version-info-label">{t("about.contributors")}</div>
              <div className="version-info-value">
                {githubStats.contributors !== null ? githubStats.contributors : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* License */}
        <div className="text-center license-footer">
          <p>{t("about.licensedUnderMIT")}</p>
        </div>
      </div>
    </div>
  );
};

export default About;
