import type React from "react";
import { useEffect, useState } from "react";
import { getEnabledNetworks } from "../../../config/networks";
import NetworkIcon from "../../common/NetworkIcon";

interface GitHubStats {
  commits: number | null;
  contributors: number | null;
}

const About: React.FC = () => {
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
        // Fetch contributors count
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

        // Fetch commit count from default branch
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

  const visionCommitments = [
    {
      title: "Trusted Open-Source Alternative",
      description:
        "To be recognised as the most trusted and best alternative to existing, centralised explorer services.",
    },
    {
      title: "Open Standard Adoption",
      description:
        "To serve as a ubiquitous open standard, readily adopted by major wallets, dApps, and blockchain networks.",
    },
    {
      title: "Lean and Transparent Team",
      description:
        "To maintain a small, focused, high-quality core team operating with complete financial and operational transparency.",
    },
    {
      title: "Growth over Extraction",
      description:
        "To ensure all generated revenue is reinvested solely for the platform's continuous development and growth.",
    },
  ];

  const corePrinciples = [
    {
      icon: "👤",
      title: "User-First Mandate",
      description:
        "The platform is permanently free, fully open, and completely transparent for all end-users.",
    },
    {
      icon: "🔒",
      title: "Privacy & Experience",
      description: "No invasive advertising, trackers, or hidden user-data harvesting.",
    },
    {
      icon: "📖",
      title: "Open-Source & Auditable",
      description:
        "The entire codebase is publicly available, auditable, and encourages community contribution.",
    },
    {
      icon: "🌱",
      title: "Organic Growth",
      description:
        "Success is driven by technical excellence, accessibility, trustworthiness, and organic adoption.",
    },
    {
      icon: "🏛️",
      title: "Infrastructure as a Public Good",
      description:
        "The decentralised ecosystem thrives when core infrastructure is free, accessible, and neutral.",
    },
  ];

  const features = [
    {
      title: "Multi-Chain Support",
      description:
        "Explore Ethereum Mainnet, Sepolia, Arbitrum One, Optimism, Base, and local development networks.",
    },
    {
      title: "Block Explorer",
      description:
        "View detailed information about blocks, transactions, and addresses across all supported chains.",
    },
    {
      title: "Contract Verification",
      description:
        "Integration with Sourcify API to display verified contract source code, ABI, and metadata.",
    },
    {
      title: "Real-Time Data",
      description: "Live network statistics, gas prices, and blockchain data for supported chains.",
    },
    {
      title: "Modern UI",
      description:
        "Clean, responsive interface with dark theme optimized for blockchain data visualization.",
    },
    {
      title: "Fast Performance",
      description:
        "Efficient caching and lazy loading for quick data access and smooth user experience.",
    },
  ];

  const networks = getEnabledNetworks();

  return (
    <div className="container-medium page-container-padded">
      <div className="page-card">
        {/* Header */}
        <div className="text-center mb-large">
          <h1 className="page-heading">OpenScan</h1>
          <p className="page-subtitle">A Decentralised Explorer</p>
        </div>

        {/* Vision Section */}
        <div className="about-section">
          <p className="about-section-intro">
            Our long-term vision is to establish the most accessible, neutral, and transparent
            blockchain exploration infrastructure globally—one that is{" "}
            <strong>not governed by private companies</strong> and sustained by ethical,
            non-extractive revenue models.
          </p>
          <div className="data-grid-2 mb-large">
            {visionCommitments.map((item) => (
              <div key={item.title} className="feature-card text-center">
                <h3 className="feature-card-title">{item.title}</h3>
                <p className="feature-card-description">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Core Principles Section */}
        <div className="about-section">
          <h2 className="page-heading-large text-center">Core Principles</h2>
          <p className="about-section-intro">
            OpenScan is not merely a product; it is a declaration of principles for public
            blockchain infrastructure.
          </p>
          <div className="principles-list">
            {corePrinciples.map((principle) => (
              <div key={principle.title} className="principle-item">
                <span className="principle-icon">{principle.icon}</span>
                <div className="principle-content">
                  <h4 className="principle-title">{principle.title}</h4>
                  <p className="principle-description">{principle.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <h2 className="page-heading-large text-center">Features</h2>
        <div className="data-grid-3-centered mb-large">
          {features.map((feature) => (
            <div key={feature.title} className="feature-card text-center">
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-description">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Supported Networks */}
        <h2 className="page-heading-large text-center">Supported Networks</h2>
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
          <h2 className="opensource-title">Open Source</h2>
          <p className="opensource-description">
            OpenScan is free and open source software. The entire codebase is publicly available,
            auditable, and welcomes community contribution.
          </p>
          <a
            href="https://github.com/openscan-explorer/explorer"
            target="_blank"
            rel="noopener noreferrer"
            className="button-primary-inline"
          >
            View on GitHub
          </a>
        </div>

        {/* Version Info Card */}
        <div className="version-card">
          <div className="version-card-grid-4 text-center">
            <div className="version-info-item">
              <div className="version-info-label">Version</div>
              <div className="version-info-value">{appVersion}</div>
            </div>
            <div className="version-info-item">
              <div className="version-info-label">Commit</div>
              <div className="version-info-value-mono">{formattedCommitHash}</div>
            </div>
            <div className="version-info-item">
              <div className="version-info-label">Total Commits</div>
              <div className="version-info-value">
                {githubStats.commits !== null ? githubStats.commits.toLocaleString() : "—"}
              </div>
            </div>
            <div className="version-info-item">
              <div className="version-info-label">Contributors</div>
              <div className="version-info-value">
                {githubStats.contributors !== null ? githubStats.contributors : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* License */}
        <div className="text-center license-footer">
          <p>OpenScan is licensed under the MIT License</p>
          <p className="license-footer-spacing">
            Built with purpose for the decentralised ecosystem
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
