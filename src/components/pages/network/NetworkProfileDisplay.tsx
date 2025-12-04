import React, { useCallback, useEffect, useState } from "react";
import Markdown from "react-markdown";
import { fetchNetworkProfile, isSubscriptionActive } from "../../../services/MetadataService";
import type { NetworkConfig } from "../../../types";
import TierBadge from "../../common/TierBadge";

interface ProfileDisplayProps {
  network: NetworkConfig | undefined;
}

type ProfileState = "collapsed" | "loading" | "expanded" | "error";

const ProfileDisplay: React.FC<ProfileDisplayProps> = React.memo(({ network }) => {
  const [profileState, setProfileState] = useState<ProfileState>("collapsed");
  const [profileContent, setProfileContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasActiveSubscription = network?.subscription && isSubscriptionActive(network.subscription);
  const hasProfile = !!network?.profile;

  // Reset state when network changes
  const networkId = network?.networkId;
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset state when networkId changes
  useEffect(() => {
    setProfileState("collapsed");
    setProfileContent(null);
    setError(null);
  }, [networkId]);

  const handleExpandClick = useCallback(async () => {
    if (!network?.profile || !hasActiveSubscription) {
      return;
    }

    // If already expanded, collapse
    if (profileState === "expanded") {
      setProfileState("collapsed");
      return;
    }

    // If content already loaded, just expand
    if (profileContent) {
      setProfileState("expanded");
      return;
    }

    // Load the profile content
    setProfileState("loading");
    setError(null);

    try {
      const content = await fetchNetworkProfile(network.profile);
      setProfileContent(content);
      setProfileState("expanded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
      setProfileState("error");
    }
  }, [network?.profile, hasActiveSubscription, profileState, profileContent]);

  // Don't render anything if no subscription or no profile
  if (!hasActiveSubscription || !hasProfile) {
    return null;
  }

  return (
    <div className="container-wide profile-container">
      {/* Collapsed state - show button */}
      {profileState === "collapsed" && (
        <button type="button" className="profile-expand-button" onClick={handleExpandClick}>
          <span className="profile-expand-text">More about {network?.name}</span>
          <TierBadge subscription={network?.subscription} size="small" />
          <span className="profile-expand-icon">▼</span>
        </button>
      )}

      {/* Loading state */}
      {profileState === "loading" && (
        <div className="block-display-card">
          <div className="text-center profile-loading">Loading network profile...</div>
        </div>
      )}

      {/* Error state */}
      {profileState === "error" && (
        <div className="block-display-card">
          <div className="text-center profile-error">
            Failed to load profile: {error}
            <button type="button" className="profile-retry-button" onClick={handleExpandClick}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Expanded state - show full profile */}
      {profileState === "expanded" && profileContent && (
        <div className="block-display-card">
          <div className="profile-header">
            <h2 className="profile-title">About {network?.name}</h2>
            <div className="profile-header-actions">
              <TierBadge subscription={network?.subscription} size="medium" showSuffix />
              <button
                type="button"
                className="profile-collapse-button"
                onClick={handleExpandClick}
                aria-label="Collapse profile"
              >
                ▲
              </button>
            </div>
          </div>
          <div className="profile-content">
            <Markdown
              components={{
                // Custom renderers for styling
                h1: ({ children }) => <h1 className="profile-h1">{children}</h1>,
                h2: ({ children }) => <h2 className="profile-h2">{children}</h2>,
                h3: ({ children }) => <h3 className="profile-h3">{children}</h3>,
                h4: ({ children }) => <h4 className="profile-h4">{children}</h4>,
                h5: ({ children }) => <h5 className="profile-h5">{children}</h5>,
                h6: ({ children }) => <h6 className="profile-h6">{children}</h6>,
                p: ({ children }) => <p className="profile-p">{children}</p>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="profile-link">
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="profile-ul">{children}</ul>,
                ol: ({ children }) => <ol className="profile-ol">{children}</ol>,
                li: ({ children }) => <li className="profile-li">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="profile-blockquote">{children}</blockquote>
                ),
                code: ({ className, children }) => {
                  // Check if it's a code block (has language class) or inline code
                  const isCodeBlock = className?.startsWith("language-");
                  if (isCodeBlock) {
                    return (
                      <pre className="profile-code-block">
                        <code>{children}</code>
                      </pre>
                    );
                  }
                  return <code className="profile-inline-code">{children}</code>;
                },
                pre: ({ children }) => <>{children}</>,
                hr: () => <hr className="profile-hr" />,
                img: ({ src, alt }) => <img src={src} alt={alt} className="profile-image" />,
              }}
            >
              {profileContent}
            </Markdown>
          </div>
          {network?.links && network.links.length > 0 && (
            <div className="profile-links">
              <h3 className="profile-links-title">Official Links</h3>
              <div className="profile-links-list">
                {network.links.map((link, index) => (
                  <a
                    key={`${link.name}-${index}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-link-item"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ProfileDisplay.displayName = "ProfileDisplay";

export default ProfileDisplay;
