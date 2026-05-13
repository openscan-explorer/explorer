import { useTranslation } from "react-i18next";
import type { NetworkConfig } from "../../../../types";
import { useFeeHistory } from "../../../../hooks/useFeeHistory";
import GasTendencyChart from "./GasTendencyChart";

interface Props {
  network: NetworkConfig | number;
  namespace?: "network" | "block";
  blockCount?: number;
}

const DEFAULT_BLOCK_COUNT = 50;

const GasTendencyChartSection: React.FC<Props> = ({
  network,
  namespace = "network",
  blockCount = DEFAULT_BLOCK_COUNT,
}) => {
  const { t } = useTranslation(namespace);
  const { feeHistory, isLoading, error } = useFeeHistory(network, blockCount);

  // Hide the section entirely on error or when there's no usable data after loading.
  if (error || (!isLoading && (!feeHistory || feeHistory.gasUsedRatio.length === 0))) {
    return null;
  }

  return (
    <section
      className="dashboard-table-section gas-tendency-section"
      data-testid="gas-tendency-section"
    >
      <header className="dashboard-table-header">
        <h2 className="dashboard-table-title">{t("gasTendency.title")}</h2>
      </header>
      <GasTendencyChart feeHistory={feeHistory} isLoading={isLoading} />
    </section>
  );
};

export default GasTendencyChartSection;
