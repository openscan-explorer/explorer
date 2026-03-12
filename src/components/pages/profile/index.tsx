import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  fetchProfile,
  type ProfileData,
  type ProfileType,
} from "../../../services/MetadataService";
import { Link } from "react-router-dom";
import Loader from "../../common/Loader";
import ProfileAppDisplay from "./ProfileAppDisplay";
import ProfileNetworkDisplay from "./ProfileNetworkDisplay";
import ProfileOrgDisplay from "./ProfileOrgDisplay";

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { profileType, profileId } = useParams<{
    profileType?: string;
    profileId?: string;
  }>();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileType || !profileId) {
      setError(t("profile.invalidUrl"));
      setLoading(false);
      return;
    }

    // Validate profile type
    const validTypes: ProfileType[] = ["network", "app", "organization"];
    if (!validTypes.includes(profileType as ProfileType)) {
      setError(t("profile.invalidType", { type: profileType }));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchProfile(profileType as ProfileType, profileId)
      .then((data) => {
        if (data) {
          setProfile(data);
        } else {
          setError(t("profile.notFoundMessage", { type: profileType, id: profileId }));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t("profile.fetchError"));
        setLoading(false);
      });
  }, [profileType, profileId, t]);

  // Render the appropriate display component based on profile type
  const renderProfileDisplay = () => {
    if (!profile) return null;

    switch (profile.type) {
      case "network":
        return <ProfileNetworkDisplay profile={profile} />;
      case "app":
        return <ProfileAppDisplay profile={profile} />;
      case "organization":
        return <ProfileOrgDisplay profile={profile} />;
      default:
        return <p>{t("profile.unknownType")}</p>;
    }
  };

  return (
    <div className="container-medium page-container-padded">
      <div className="page-card">
        {loading && <Loader text={t("profile.loading")} />}

        {error && (
          <div className="text-center" style={{ padding: "40px 20px" }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.4, marginBottom: 16 }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle
                cx="12"
                cy="16"
                r="0.5"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
            <h1 className="page-heading" style={{ color: "var(--text-color, #fff)" }}>
              {t("profile.notFound")}
            </h1>
            <p className="text-muted" style={{ marginBottom: 24 }} role="alert">
              {t("profile.notFoundFriendly")}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/" className="button-primary-inline">
                {t("profile.goHome")}
              </Link>
              <Link to="/supporters" className="button-secondary-inline">
                {t("profile.browseSupporters")}
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && profile && renderProfileDisplay()}
      </div>
    </div>
  );
};

export default Profile;
