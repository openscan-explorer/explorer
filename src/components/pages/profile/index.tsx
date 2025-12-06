import type React from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchProfile,
  type ProfileData,
  type ProfileType,
} from "../../../services/MetadataService";
import Loader from "../../common/Loader";
import ProfileAppDisplay from "./ProfileAppDisplay";
import ProfileNetworkDisplay from "./ProfileNetworkDisplay";
import ProfileOrgDisplay from "./ProfileOrgDisplay";

const Profile: React.FC = () => {
  const { profileType, profileId } = useParams<{
    profileType?: string;
    profileId?: string;
  }>();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileType || !profileId) {
      setError("Invalid profile URL. Please provide both profile type and ID.");
      setLoading(false);
      return;
    }

    // Validate profile type
    const validTypes: ProfileType[] = ["network", "app", "organization"];
    if (!validTypes.includes(profileType as ProfileType)) {
      setError(`Invalid profile type: ${profileType}. Must be one of: network, app, organization.`);
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
          setError(`Profile not found: ${profileType}/${profileId}`);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch profile");
        setLoading(false);
      });
  }, [profileType, profileId]);

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
        return <p>Unknown profile type</p>;
    }
  };

  return (
    <div className="container-medium page-container-padded">
      <div className="page-card">
        {loading && <Loader text="Loading profile..." />}

        {error && (
          <div className="text-center">
            <h1 className="page-heading">Profile Not Found</h1>
            <p className="error-text-center">{error}</p>
          </div>
        )}

        {!loading && !error && profile && renderProfileDisplay()}
      </div>
    </div>
  );
};

export default Profile;
