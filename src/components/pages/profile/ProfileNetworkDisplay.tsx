import type React from "react";
import Markdown from "react-markdown";
import { Link } from "react-router-dom";
import type { ProfileData } from "../../../services/MetadataService";
import { isSubscriptionActive } from "../../../services/MetadataService";
import TierBadge from "../../common/TierBadge";

interface ProfileNetworkDisplayProps {
  profile: ProfileData;
}

const ProfileNetworkDisplay: React.FC<ProfileNetworkDisplayProps> = ({ profile }) => {
  const hasActiveSubscription = isSubscriptionActive(profile.subscription);
  const tier = profile.subscription?.tier || 0;

  return (
    <div className="profile-display profile-network">
      {/* Header Section */}
      <div className="profile-header">
        <div className="profile-header-content">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt={profile.name} className="profile-logo" />
          ) : (
            <div
              className="profile-logo-placeholder"
              style={{ "--profile-color": profile.color || "#10b981" } as React.CSSProperties}
            >
              {profile.name.charAt(0)}
            </div>
          )}
          <div className="profile-header-info">
            <div className="profile-title-row">
              <h1 className="profile-name">{profile.name}</h1>
              {hasActiveSubscription && profile.subscription && (
                <TierBadge subscription={profile.subscription} size="medium" />
              )}
              {profile.isTestnet && (
                <span className="profile-badge profile-badge-testnet">Testnet</span>
              )}
            </div>
            {profile.description && <p className="profile-description">{profile.description}</p>}
            <div className="profile-meta">
              <span className="profile-meta-item">
                <span className="profile-meta-label">Chain ID:</span>
                <span className="profile-meta-value">{profile.chainId}</span>
              </span>
              {profile.currency && (
                <span className="profile-meta-item">
                  <span className="profile-meta-label">Currency:</span>
                  <span className="profile-meta-value">{profile.currency}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Available for all tiers */}
      <div className="profile-section">
        <h2 className="profile-section-title">Explore</h2>
        <div className="profile-actions">
          <Link to={`/${profile.chainId}`} className="profile-action-btn">
            View Network
          </Link>
          <Link to={`/${profile.chainId}/blocks`} className="profile-action-btn">
            Blocks
          </Link>
          <Link to={`/${profile.chainId}/txs`} className="profile-action-btn">
            Transactions
          </Link>
        </div>
      </div>

      {/* Links Section - Available for tier 2+ */}
      {tier >= 2 && profile.links && profile.links.length > 0 && (
        <div className="profile-section">
          <h2 className="profile-section-title">Links</h2>
          <div className="profile-links">
            {profile.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-link-card"
              >
                <span className="profile-link-name">{link.name}</span>
                {link.description && (
                  <span className="profile-link-description">{link.description}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* RPC Endpoints - Available for tier 2+ */}
      {tier >= 2 && profile.rpc?.public && profile.rpc.public.length > 0 && (
        <div className="profile-section">
          <h2 className="profile-section-title">Public RPC Endpoints</h2>
          <div className="profile-rpc-list">
            {profile.rpc.public.map((rpcUrl) => (
              <div key={rpcUrl} className="profile-rpc-item">
                <code>{rpcUrl}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Markdown Content - Always shown for networks */}
      {profile.profileMarkdown && (
        <div className="profile-section">
          <h2 className="profile-section-title">About</h2>
          <div className="profile-markdown">
            <Markdown
              components={{
                h1: ({ children }) => <h3 className="profile-md-h1">{children}</h3>,
                h2: ({ children }) => <h4 className="profile-md-h2">{children}</h4>,
                h3: ({ children }) => <h5 className="profile-md-h3">{children}</h5>,
                p: ({ children }) => <p className="profile-md-p">{children}</p>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-md-link"
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="profile-md-ul">{children}</ul>,
                ol: ({ children }) => <ol className="profile-md-ol">{children}</ol>,
                li: ({ children }) => <li className="profile-md-li">{children}</li>,
                code: ({ children }) => <code className="profile-md-code">{children}</code>,
              }}
            >
              {profile.profileMarkdown}
            </Markdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileNetworkDisplay;
