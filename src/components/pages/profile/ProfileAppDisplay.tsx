import type React from "react";
import Markdown from "react-markdown";
import { Link } from "react-router-dom";
import type { ProfileData } from "../../../services/MetadataService";
import { isSubscriptionActive } from "../../../services/MetadataService";
import TierBadge from "../../common/TierBadge";

interface ProfileAppDisplayProps {
  profile: ProfileData;
}

const ProfileAppDisplay: React.FC<ProfileAppDisplayProps> = ({ profile }) => {
  const hasActiveSubscription = isSubscriptionActive(profile.subscription);
  const tier = profile.subscription?.tier || 0;

  return (
    <div className="profile-display profile-app">
      {/* Header Section */}
      <div className="profile-header">
        <div className="profile-header-content">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt={profile.name} className="profile-logo" />
          ) : (
            <div className="profile-logo-placeholder">{profile.name.charAt(0)}</div>
          )}
          <div className="profile-header-info">
            <div className="profile-title-row">
              <h1 className="profile-name">{profile.name}</h1>
              {hasActiveSubscription && profile.subscription && (
                <TierBadge subscription={profile.subscription} size="medium" />
              )}
              {profile.verified && (
                <span className="profile-badge profile-badge-verified">Verified</span>
              )}
            </div>
            {profile.description && <p className="profile-description">{profile.description}</p>}
            {profile.tags && profile.tags.length > 0 && (
              <div className="profile-tags">
                {profile.tags.map((tag) => (
                  <span key={tag} className="profile-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
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

      {/* Supported Networks - Available for tier 2+ */}
      {tier >= 2 && profile.networks && profile.networks.length > 0 && (
        <div className="profile-section">
          <h2 className="profile-section-title">Supported Networks</h2>
          <div className="profile-networks">
            {profile.networks.map((chainId) => (
              <Link key={chainId} to={`/${chainId}`} className="profile-network-chip">
                Chain {chainId}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Profile Markdown Content - Available for tier 3 only */}
      {tier >= 3 && profile.profileMarkdown && (
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

export default ProfileAppDisplay;
