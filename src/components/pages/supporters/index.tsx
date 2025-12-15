import type React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSupporters, type Supporter } from "../../../services/MetadataService";
import Loader from "../../common/Loader";
import TierBadge from "../../common/TierBadge";

const Supporters: React.FC = () => {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSupporters()
      .then((data) => {
        setSupporters(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch supporters");
        setLoading(false);
      });
  }, []);

  // Group supporters by tier
  const allies = supporters.filter((s) => s.currentTier === 3);
  const partners = supporters.filter((s) => s.currentTier === 2);
  const backers = supporters.filter((s) => s.currentTier === 1);

  return (
    <div className="container-medium page-container-padded">
      <div className="page-card">
        <div className="text-center mb-large">
          <h1 className="page-heading">Openscan Supporters</h1>
          <p className="page-subtitle">
            Thanks to everyone who supports Openscan and helps keep it online, free and ad-free!
          </p>
        </div>

        {loading && <Loader text="Loading supporters..." />}

        {error && <p className="error-text-center">Error: {error}</p>}

        {!loading && !error && supporters.length === 0 && (
          <div className="text-center">
            <p className="supporters-empty">No supporters yet. Be the first to support Openscan!</p>
            <Link to="/subscriptions" className="button-primary-inline">
              Become a Supporter
            </Link>
          </div>
        )}

        {!loading && !error && supporters.length > 0 && (
          <div className="supporters-container">
            {allies.length > 0 && (
              <div className="supporters-tier-section">
                <h2 className="supporters-tier-title">
                  <span className="tier-icon">🏆</span> Allies
                </h2>
                <div className="supporters-grid supporters-grid-allies">
                  {allies.map((supporter) => (
                    <SupporterCard key={supporter.id} supporter={supporter} />
                  ))}
                </div>
              </div>
            )}

            {partners.length > 0 && (
              <div className="supporters-tier-section">
                <h2 className="supporters-tier-title">
                  <span className="tier-icon">🤝</span> Partners
                </h2>
                <div className="supporters-grid supporters-grid-partners">
                  {partners.map((supporter) => (
                    <SupporterCard key={supporter.id} supporter={supporter} />
                  ))}
                </div>
              </div>
            )}

            {backers.length > 0 && (
              <div className="supporters-tier-section">
                <h2 className="supporters-tier-title">
                  <span className="tier-icon">💪</span> Backers
                </h2>
                <div className="supporters-grid supporters-grid-backers">
                  {backers.map((supporter) => (
                    <SupporterCard key={supporter.id} supporter={supporter} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center supporters-cta">
          <p>Want to support OpenScan and get your network featured?</p>
          <Link to="/subscriptions" className="button-primary-inline">
            View Subscription Plans
          </Link>
        </div>
      </div>
    </div>
  );
};

interface SupporterCardProps {
  supporter: Supporter;
}

const SupporterCard: React.FC<SupporterCardProps> = ({ supporter }) => {
  // Link based on supporter type - tokens link to address page, others to profile
  const getLink = () => {
    switch (supporter.type) {
      case "token":
        // Token id is the token address, link to address page on the network
        if (supporter.chainId) {
          return `/${supporter.chainId}/address/${supporter.id}`;
        }
        return undefined;
      case "network":
        return `/profile/network/${supporter.chainId || supporter.id}`;
      case "app":
        return `/profile/app/${supporter.id}`;
      case "organization":
        return `/profile/organization/${supporter.id}`;
      default:
        return undefined;
    }
  };

  const link = getLink();
  const cardContent = (
    <div className="supporter-card-content">
      {supporter.logo ? (
        <img src={supporter.logo} alt={supporter.name} className="supporter-logo" />
      ) : (
        <div
          className="supporter-logo-placeholder"
          style={{ "--supporter-color": supporter.color || "#10b981" } as React.CSSProperties}
        >
          {supporter.name.charAt(0)}
        </div>
      )}
      <div className="supporter-info">
        <span className="supporter-name">{supporter.name}</span>
        <div className="supporter-meta">
          <TierBadge
            subscription={{ tier: supporter.currentTier, expiresAt: supporter.expiresAt }}
            size="small"
          />
          <span className="supporter-type">{supporter.type}</span>
        </div>
      </div>
    </div>
  );

  if (link) {
    return (
      <Link
        to={link}
        className="supporter-card"
        style={
          {
            "--supporter-color": supporter.color || "rgba(255, 255, 255, 0.1)",
          } as React.CSSProperties
        }
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <div
      className="supporter-card supporter-card-no-link"
      style={
        {
          "--supporter-color": supporter.color || "rgba(255, 255, 255, 0.1)",
        } as React.CSSProperties
      }
    >
      {cardContent}
    </div>
  );
};

export default Supporters;
