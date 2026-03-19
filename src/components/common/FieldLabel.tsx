import { useTranslation } from "react-i18next";
import type { KnowledgeLevel } from "../../types";
import { useSettings } from "../../context/SettingsContext";
import HelperTooltip from "./HelperTooltip";

interface FieldLabelProps {
  label: string;
  tooltipKey?: string;
  visibleFor?: KnowledgeLevel[];
  className?: string;
}

const FieldLabel: React.FC<FieldLabelProps> = ({
  label,
  tooltipKey,
  visibleFor,
  className = "tx-label",
}) => {
  const { settings } = useSettings();
  const { t } = useTranslation("tooltips");

  const level = settings.knowledgeLevel ?? "beginner";
  const tooltipsEnabled = settings.showHelperTooltips !== false;

  const shouldShow = tooltipsEnabled && tooltipKey && (!visibleFor || visibleFor.includes(level));

  return (
    <span className={className}>
      {label}
      {shouldShow && <HelperTooltip content={t(tooltipKey as never)} />}
    </span>
  );
};

export default FieldLabel;
