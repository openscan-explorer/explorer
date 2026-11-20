import { useTranslation } from "react-i18next";
import type { FeeHistory, NetworkConfig } from "../../../../types";
import { useFeeHistory } from "../../../../hooks/useFeeHistory";
import GasTendencyChart from "./GasTendencyChart";

interface Props {
  network: NetworkConfig | number;
}

/**
 * A fee history is worth plotting when it covers at least one block and the
 * chain has a non-zero base fee. Chains without EIP-1559 (or with the base fee
 * pinned at zero, like BSC) report all-zero base fees, which would draw a flat
 * line at 0 gwei.
 */
const isPlottable = (feeHistory: FeeHistory | null): feeHistory is FeeHistory =>
  feeHistory !== null &&
  feeHistory.gasUsedRatio.length > 0 &&
  feeHistory.baseFeePerGas.some((fee) => fee > 0n);

const GasTendencyChartSection: React.FC<Props> = ({ network }) => {
  const { t } = useTranslation("network");
  const { feeHistory, isLoading } = useFeeHistory(network);
  const plottable = isPlottable(feeHistory) ? feeHistory : null;

  // Hide the section once loading settles without usable data (unsupported RPC,
  // non-EIP-1559 chain, or a first fetch that failed). A refresh that fails after
  // a successful fetch keeps the last good data on screen.
  if (!plottable && !isLoading) {
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
      <GasTendencyChart feeHistory={plottable} />
    </section>
  );
};

export default GasTendencyChartSection;
