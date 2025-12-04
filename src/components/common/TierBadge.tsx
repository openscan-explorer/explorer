import React from "react";
import { getSubscriptionTierName, isSubscriptionActive } from "../../services/MetadataService";
import type { NetworkSubscription } from "../../types";

interface TierBadgeProps {
  subscription: NetworkSubscription | undefined;
  /** Size variant */
  size?: "small" | "medium";
  /** Whether to show "Subscriber" suffix */
  showSuffix?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Displays a subscription tier badge (Backer, Partner, or Ally)
 * Only renders if the subscription is active
 */
const TierBadge: React.FC<TierBadgeProps> = React.memo(
  ({ subscription, size = "medium", showSuffix = false, className = "" }) => {
    if (!subscription || !isSubscriptionActive(subscription)) {
      return null;
    }

    const tierName = getSubscriptionTierName(subscription.tier);
    const sizeClass = size === "small" ? "tier-badge-small" : "tier-badge-medium";

    return (
      <span
        className={`tier-badge tier-badge-${subscription.tier} ${sizeClass} ${className}`.trim()}
      >
        {tierName}
        {showSuffix}
      </span>
    );
  },
);

TierBadge.displayName = "TierBadge";

export default TierBadge;
