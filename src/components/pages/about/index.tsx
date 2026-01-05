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
      title: "Free & Open Source",
      description:
        "100% open source, publicly auditable, and free for all users. No vendor lock-in.",
    },
    {
      title: "Privacy First",
      description: "No advertising, no trackers, no user data harvesting. Your data stays yours.",
    },
    {
      title: "Trustless by Design",
      description:
        "Direct RPC connections to blockchain nodes. Verify data independently, no intermediaries.",
    },
    {
      title: "Public Infrastructure",
      description:
        "Built as a public good for the decentralized ecosystem, sustained by ethical funding.",
    },
  ];

  const features = [
    {
      title: "Multi-Chain Explorer",
      description: "Explore blocks, transactions, and addresses across multiple EVM networks.",
    },
    {
      title: "Contract Interaction",
      description: "Read and write to verified smart contracts directly from the explorer.",
    },
    {
      title: "Local Development",
      description: "Full support for Hardhat and Anvil local networks with trace capabilities.",
    },
    {
      title: "RPC Transparency",
      description: "Compare responses across multiple RPC providers. Detect inconsistencies.",
    },
  ];

  const networks = getEnabledNetworks();

  return (
    <div className="container-medium page-container-padded">
      <div className="page-card">
        {/* Header */}
        <div className="text-center mb-large">
          <h1 className="page-heading">OPENSCAN</h1>
          <p className="page-subtitle">Trustless Blockchain Exploration</p>
        </div>

        {/* Mission Statement */}
        <div className="about-section">
          <p className="about-section-intro">
            OpenScan is an open-source, lightweight blockchain explorer built to provide
            transparency and true openness. We connect directly to blockchain nodes, giving you
            unfettered access to on-chain data without intermediaries or centralized services.
          </p>
        </div>

        {/* Core Principles */}
        <div className="about-section">
          <h2 className="page-heading-large text-center">Principles</h2>
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
          <h2 className="page-heading-large text-center">Features</h2>
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
            The entire codebase is publicly available and welcomes community contributions.
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

        {/* Version Info */}
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
          <p>Licensed under MIT</p>
        </div>
      </div>
    </div>
  );
};

export default About;
