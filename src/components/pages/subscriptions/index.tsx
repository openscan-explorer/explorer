import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OPENSCAN_DAO_ADDRESS } from "../../../config/index";
import "../../../styles/subscriptions.css";

type SubscriptionCategory = "tokens" | "networks" | "apps" | "companies";

interface TierBenefit {
  tier: string;
  tierKey: string;
  benefits: string[];
}

interface SubscriptionType {
  id: SubscriptionCategory;
  name: string;
  basePrice: number;
  description: string;
  tiers: TierBenefit[];
}

const tierMultipliers: Record<string, number> = {
  Backer: 1,
  Partner: 3,
  Ally: 6,
};

// Early adopter discount periods with graduated rates
const EARLY_ADOPTER_PERIODS = [
  {
    start: new Date("2026-01-01T00:00:00"),
    end: new Date("2026-01-31T23:59:59"),
    discount: 0.4, // 40% off
    label: "January 2026",
  },
  {
    start: new Date("2026-02-01T00:00:00"),
    end: new Date("2026-02-28T23:59:59"),
    discount: 0.3, // 30% off
    label: "February 2026",
  },
  {
    start: new Date("2026-03-01T00:00:00"),
    end: new Date("2026-03-31T23:59:59"),
    discount: 0.2, // 20% off
    label: "March 2026",
  },
];

const getCurrentEarlyAdopterDiscount = (): number | null => {
  const now = new Date();
  for (const period of EARLY_ADOPTER_PERIODS) {
    if (now >= period.start && now <= period.end) {
      return period.discount;
    }
  }
  return null;
};

const isEarlyAdopterPeriod = (): boolean => {
  return getCurrentEarlyAdopterDiscount() !== null;
};

const Subscriptions: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<SubscriptionCategory>("tokens");

  const subscriptionTypes: SubscriptionType[] = [
    {
      id: "tokens",
      name: t("subscriptions.categories.tokens.name"),
      basePrice: 500,
      description: t("subscriptions.categories.tokens.description"),
      tiers: [
        {
          tier: t("subscriptions.tierNames.backer"),
          tierKey: "backer",
          benefits: t("subscriptions.tierBenefits.tokens.backer", {
            returnObjects: true,
          }) as string[],
        },
        {
          tier: t("subscriptions.tierNames.partner"),
          tierKey: "partner",
          benefits: t("subscriptions.tierBenefits.tokens.partner", {
            returnObjects: true,
          }) as string[],
        },
        {
          tier: t("subscriptions.tierNames.ally"),
          tierKey: "ally",
          benefits: t("subscriptions.tierBenefits.tokens.ally", {
            returnObjects: true,
          }) as string[],
        },
      ],
    },
    {
      id: "networks",
      name: t("subscriptions.categories.networks.name"),
      basePrice: 2000,
      description: t("subscriptions.categories.networks.description"),
      tiers: [
        {
          tier: t("subscriptions.tierNames.backer"),
          tierKey: "backer",
          benefits: t("subscriptions.tierBenefits.networks.backer", {
            returnObjects: true,
          }) as string[],
        },
        {
          tier: t("subscriptions.tierNames.partner"),
          tierKey: "partner",
          benefits: t("subscriptions.tierBenefits.networks.partner", {
            returnObjects: true,
          }) as string[],
        },
        {
          tier: t("subscriptions.tierNames.ally"),
          tierKey: "ally",
          benefits: t("subscriptions.tierBenefits.networks.ally", {
            returnObjects: true,
          }) as string[],
        },
      ],
    },
    {
      id: "apps",
      name: t("subscriptions.categories.apps.name"),
      basePrice: 1000,
      description: t("subscriptions.categories.apps.description"),
      tiers: [
        {
          tier: t("subscriptions.tierNames.backer"),
          tierKey: "backer",
          benefits: t("subscriptions.tierBenefits.apps.backer", {
            returnObjects: true,
          }) as string[],
        },
        {
          tier: t("subscriptions.tierNames.partner"),
          tierKey: "partner",
          benefits: t("subscriptions.tierBenefits.apps.partner", {
            returnObjects: true,
          }) as string[],
        },
        {
          tier: t("subscriptions.tierNames.ally"),
          tierKey: "ally",
          benefits: t("subscriptions.tierBenefits.apps.ally", {
            returnObjects: true,
          }) as string[],
        },
      ],
    },
    {
      id: "companies",
      name: t("subscriptions.categories.companies.name"),
      basePrice: 500,
      description: t("subscriptions.categories.companies.description"),
      tiers: [
        {
          tier: t("subscriptions.tierNames.backer"),
          tierKey: "backer",
          benefits: t("subscriptions.tierBenefits.companies.backer", {
            returnObjects: true,
          }) as string[],
        },
        {
          tier: t("subscriptions.tierNames.partner"),
          tierKey: "partner",
          benefits: t("subscriptions.tierBenefits.companies.partner", {
            returnObjects: true,
          }) as string[],
        },
        {
          tier: t("subscriptions.tierNames.ally"),
          tierKey: "ally",
          benefits: t("subscriptions.tierBenefits.companies.ally", {
            returnObjects: true,
          }) as string[],
        },
      ],
    },
  ];

  const selectedSubscription = subscriptionTypes.find((s) => s.id === selectedCategory);

  const earlyAdopterActive = isEarlyAdopterPeriod();

  return (
    <div className="container-medium page-container-padded">
      <div className="page-card">
        {/* Header */}
        <div className="text-center mb-large">
          <h1 className="page-heading">{t("subscriptions.title")}</h1>
          <p className="page-subtitle">{t("subscriptions.subtitle")}</p>
        </div>

        {/* Value Proposition */}
        <div className="subscriptions-intro">
          <p>
            {t("subscriptions.valueProposition").split(t("subscriptions.freeForAllUsers"))[0]}
            <strong>{t("subscriptions.freeForAllUsers")}</strong>
            {t("subscriptions.valueProposition").split(t("subscriptions.freeForAllUsers"))[1]}
          </p>
        </div>

        {/* Category Tabs */}
        <div className="subscriptions-tabs">
          {subscriptionTypes.map((sub) => (
            // biome-ignore lint/a11y/useButtonType: tab buttons don't need explicit type
            <button
              key={sub.id}
              className={`subscriptions-tab ${selectedCategory === sub.id ? "active" : ""}`}
              onClick={() => setSelectedCategory(sub.id)}
            >
              {sub.name}
            </button>
          ))}
        </div>

        {/* Selected Category Description */}
        {selectedSubscription && (
          <div className="subscriptions-category-info">
            <p className="subscriptions-category-description">{selectedSubscription.description}</p>
          </div>
        )}

        {/* Pricing Tiers */}
        {selectedSubscription && (
          <div className="subscriptions-tiers">
            {selectedSubscription.tiers.map((tier) => {
              const multiplier = tierMultipliers[tier.tier] ?? 1;
              const price = selectedSubscription.basePrice * multiplier;
              return (
                <div key={tier.tierKey} className="subscriptions-tier-card">
                  <div className="subscriptions-tier-header">
                    <h3 className="subscriptions-tier-name">
                      {t("subscriptions.tierLabel", {
                        number: Object.keys(tierMultipliers).indexOf(tier.tier) + 1,
                        name: tier.tier,
                      })}
                    </h3>
                    <div className="subscriptions-tier-price">
                      <span className="subscriptions-price-amount">${price.toLocaleString()}</span>
                      <span className="subscriptions-price-period">
                        {t("subscriptions.perMonth")}
                      </span>
                    </div>
                    <div className="subscriptions-tier-price-annual">
                      <span className="subscriptions-price-annual-amount">
                        ${(price * 12 * 0.8).toLocaleString()}
                      </span>
                      <span className="subscriptions-price-annual-period">
                        {t("subscriptions.perYear")}
                      </span>
                      <span className="subscriptions-price-annual-discount">
                        {t("subscriptions.save20")}
                      </span>
                    </div>
                  </div>
                  <div className="subscriptions-tier-benefits">
                    <ul>
                      {tier.benefits.map((benefit, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: benefits are static strings
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                  {tier.tierKey !== "backer" && (
                    <div className="subscriptions-tier-note">
                      {t("subscriptions.includesAllBenefits", {
                        tier:
                          tier.tierKey === "ally"
                            ? t("subscriptions.tierNames.partner")
                            : t("subscriptions.tierNames.backer"),
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pricing Summary Table */}
        <div className="subscriptions-summary">
          <h2 className="page-heading-large text-center">{t("subscriptions.pricingOverview")}</h2>

          {/* Early Adopter Discount Banner */}
          <div className="subscriptions-early-adopter">
            <div className="subscriptions-early-adopter-badge">
              {t("subscriptions.earlyAdopterDiscount")}
            </div>
            <div className="subscriptions-early-adopter-content">
              <p className="subscriptions-early-adopter-title">
                {t("subscriptions.limitedTimeDiscounts")}
              </p>
              <div className="subscriptions-early-adopter-tiers">
                {EARLY_ADOPTER_PERIODS.map((period, idx) => {
                  const now = new Date();
                  const isActive = now >= period.start && now <= period.end;
                  const isPast = now > period.end;
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: periods are static constants
                      key={idx}
                      className={`subscriptions-early-adopter-tier ${isActive ? "active" : ""} ${isPast ? "past" : ""}`}
                    >
                      <span className="subscriptions-early-adopter-tier-discount">
                        {t("subscriptions.percentOff", { percent: period.discount * 100 })}
                      </span>
                      <span className="subscriptions-early-adopter-tier-month">{period.label}</span>
                    </div>
                  );
                })}
              </div>
              {earlyAdopterActive && (
                <p className="subscriptions-early-adopter-status">
                  <span className="subscriptions-early-adopter-active">
                    {t("subscriptions.activeNow")}
                  </span>{" "}
                  -{" "}
                  {t("subscriptions.discountAvailable", {
                    // biome-ignore lint/style/noNonNullAssertion: earlyAdopterActive guarantees non-null
                    percent: getCurrentEarlyAdopterDiscount()! * 100,
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="subscriptions-table-wrapper">
            <table className="subscriptions-table">
              <thead>
                <tr>
                  <th>{t("subscriptions.subscriptionType")}</th>
                  <th>{t("subscriptions.tierNames.backer")}</th>
                  <th>{t("subscriptions.tierNames.partner")} (3x)</th>
                  <th>{t("subscriptions.tierNames.ally")} (6x)</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionTypes.map((sub) => {
                  const tierPrices = [1, 3, 6].map((multiplier) => {
                    const monthly = sub.basePrice * multiplier;
                    return {
                      monthly,
                      earlyAdopterPrices: EARLY_ADOPTER_PERIODS.map((p) => ({
                        price: monthly * (1 - p.discount),
                        discount: p.discount,
                        label: p.label,
                      })),
                      annual: monthly * 12 * 0.8,
                    };
                  });
                  return (
                    <tr key={sub.id}>
                      <td className="subscriptions-table-type">{sub.name}</td>
                      {tierPrices.map((tp, idx) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: tier prices are computed from static multipliers
                        <td key={idx}>
                          <div className="subscriptions-table-monthly">
                            ${tp.monthly.toLocaleString()}/mo
                          </div>
                          <div className="subscriptions-table-early-adopter-list">
                            {tp.earlyAdopterPrices.map((ea, eaIdx) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: early adopter prices are static
                              <div key={eaIdx} className="subscriptions-table-early-adopter-item">
                                <span className="subscriptions-table-ea-price">
                                  ${ea.price.toLocaleString()}
                                </span>
                                <span className="subscriptions-table-ea-discount">
                                  -{ea.discount * 100}%
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="subscriptions-table-annual">
                            ${tp.annual.toLocaleString()}/yr
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shared Roadmap Planning */}
        <div className="subscriptions-governance">
          <h2 className="page-heading-large text-center">
            {t("subscriptions.sharedRoadmapPlanning")}
          </h2>
          <p>{t("subscriptions.roadmapDescription")}</p>
          <div className="subscriptions-roadmap-features">
            <div className="subscriptions-roadmap-item">
              <h4>{t("subscriptions.featurePrioritization")}</h4>
              <p>{t("subscriptions.featurePrioritizationDescription")}</p>
            </div>
            <div className="subscriptions-roadmap-item">
              <h4>{t("subscriptions.networkExpansion")}</h4>
              <p>{t("subscriptions.networkExpansionDescription")}</p>
            </div>
            <div className="subscriptions-roadmap-item">
              <h4>{t("subscriptions.strategicDirection")}</h4>
              <p>{t("subscriptions.strategicDirectionDescription")}</p>
            </div>
          </div>
        </div>

        {/* How to Subscribe */}
        <div className="subscriptions-how-to">
          <h2 className="page-heading-large text-center">{t("subscriptions.howToSubscribe")}</h2>
          <div className="subscriptions-steps">
            <div className="subscriptions-step">
              <div className="subscriptions-step-number">1</div>
              <div className="subscriptions-step-content">
                <h4>{t("subscriptions.step1Title")}</h4>
                <p>
                  {t("subscriptions.step1Description").split("explorer-metadata")[0]}
                  <a
                    href="https://github.com/openscan-explorer/explorer-metadata"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    explorer-metadata
                  </a>
                  {t("subscriptions.step1Description").split("explorer-metadata")[1]}
                </p>
              </div>
            </div>
            <div className="subscriptions-step">
              <div className="subscriptions-step-number">2</div>
              <div className="subscriptions-step-content">
                <h4>{t("subscriptions.step2Title")}</h4>
                <p>{t("subscriptions.step2Description")}</p>
              </div>
            </div>
            <div className="subscriptions-step">
              <div className="subscriptions-step-number">3</div>
              <div className="subscriptions-step-content">
                <h4>{t("subscriptions.step3Title")}</h4>
                <p>
                  {t("subscriptions.step3Description").split("OpenScan Devtools")[0]}
                  <a href="/devtools" target="_blank" rel="noopener noreferrer">
                    OpenScan Devtools
                  </a>
                  {t("subscriptions.step3Description").split("OpenScan Devtools")[1]}
                </p>
              </div>
            </div>
            <div className="subscriptions-step">
              <div className="subscriptions-step-number">4</div>
              <div className="subscriptions-step-content">
                <h4>{t("subscriptions.step4Title")}</h4>
                <p>{t("subscriptions.step4Description")}</p>
              </div>
            </div>
          </div>

          <div className="subscriptions-payment-info">
            <h4>{t("subscriptions.paymentAddress")}</h4>
            <p>
              {t("subscriptions.paymentAddressDescription")}{" "}
              <a
                href={`/1/address/${OPENSCAN_DAO_ADDRESS}`}
                className="subscriptions-payment-address"
              >
                {OPENSCAN_DAO_ADDRESS}
              </a>
            </p>
          </div>

          <div className="subscriptions-cta-buttons">
            <a
              href="https://github.com/openscan-explorer/explorer-metadata"
              target="_blank"
              rel="noopener noreferrer"
              className="button-primary-inline"
            >
              {t("subscriptions.submitSubscriptionPR")}
            </a>
            <a href={`/1/address/${OPENSCAN_DAO_ADDRESS}`} className="button-secondary-inline">
              {t("subscriptions.viewDaoAddress")}
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center license-footer">
          <p>{t("subscriptions.footerNote")}</p>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
