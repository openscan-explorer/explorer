import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FeeHistory } from "../../../../types";

interface Props {
  feeHistory: FeeHistory | null;
  isLoading: boolean;
}

const WEI_PER_GWEI = 1_000_000_000n;
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 140;

const weiToGwei = (wei: bigint): number => {
  const whole = wei / WEI_PER_GWEI;
  const remainder = wei % WEI_PER_GWEI;
  return Number(whole) + Number(remainder) / Number(WEI_PER_GWEI);
};

const formatGwei = (gwei: number): string => {
  if (gwei >= 100) return gwei.toFixed(0);
  if (gwei >= 10) return gwei.toFixed(1);
  if (gwei >= 1) return gwei.toFixed(2);
  return gwei.toFixed(3);
};

const GasTendencyChart: React.FC<Props> = ({ feeHistory, isLoading }) => {
  const { t } = useTranslation("network");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!feeHistory || feeHistory.gasUsedRatio.length === 0) return null;
    const ratios = feeHistory.gasUsedRatio;
    const baseFees = feeHistory.baseFeePerGas.slice(0, ratios.length); // align lengths
    const gweis = baseFees.map(weiToGwei);
    const minGwei = Math.min(...gweis);
    const maxGwei = Math.max(...gweis);
    const range = Math.max(maxGwei - minGwei, 1e-9);
    return {
      ratios,
      gweis,
      minGwei,
      maxGwei,
      range,
      oldestBlock: feeHistory.oldestBlock,
      newestBlock: feeHistory.oldestBlock + ratios.length - 1,
    };
  }, [feeHistory]);

  if (isLoading && !chartData) {
    return (
      <div
        className="gas-tendency-chart gas-tendency-chart-loading"
        data-testid="gas-tendency-chart-loading"
      >
        <div className="gas-tendency-chart-skeleton" />
      </div>
    );
  }

  if (!chartData) {
    return null;
  }

  const { ratios, gweis, minGwei, maxGwei, range, oldestBlock, newestBlock } = chartData;
  const n = ratios.length;
  const barWidth = VIEW_WIDTH / n;

  const pointX = (i: number) => (i + 0.5) * barWidth;
  const pointY = (gwei: number) => {
    // 8% top/bottom padding so the line never hits the edges
    const t = (gwei - minGwei) / range;
    return VIEW_HEIGHT * (0.9 - 0.8 * t);
  };

  const linePath = gweis
    .map((g, i) => `${i === 0 ? "M" : "L"} ${pointX(i).toFixed(2)} ${pointY(g).toFixed(2)}`)
    .join(" ");

  // Area under the line for soft fill
  const areaPath = `${linePath} L ${pointX(n - 1).toFixed(2)} ${VIEW_HEIGHT} L ${pointX(0).toFixed(2)} ${VIEW_HEIGHT} Z`;

  const latestGwei = gweis[n - 1];

  return (
    <div className="gas-tendency-chart" data-testid="gas-tendency-chart">
      <div className="gas-tendency-chart-meta">
        <span className="gas-tendency-chart-meta-value">
          {formatGwei(latestGwei ?? 0)} <span className="gas-tendency-chart-meta-unit">gwei</span>
        </span>
        <span className="gas-tendency-chart-meta-range">
          {formatGwei(minGwei)} – {formatGwei(maxGwei)} gwei
        </span>
      </div>

      <div className="gas-tendency-chart-plot">
        <span className="gas-tendency-chart-reference-label" aria-hidden="true">
          50%
        </span>
        <svg
          className="gas-tendency-chart-svg"
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          aria-label={t("gasTendency.title")}
          role="img"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const xRatio = (e.clientX - rect.left) / rect.width;
            const idx = Math.min(n - 1, Math.max(0, Math.floor(xRatio * n)));
            setHoverIdx(idx);
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <title>{t("gasTendency.title")}</title>
          {/* Gas-used % bars behind the line */}
          {ratios.map((r, i) => {
            const h = Math.max(r * VIEW_HEIGHT, 1);
            return (
              <rect
                key={`bar-${oldestBlock + i}`}
                x={i * barWidth}
                y={VIEW_HEIGHT - h}
                width={Math.max(barWidth - 1, 1)}
                height={h}
                className="gas-tendency-chart-bar"
              />
            );
          })}

          {/* 50% gas-used reference line */}
          <line
            x1={0}
            x2={VIEW_WIDTH}
            y1={VIEW_HEIGHT / 2}
            y2={VIEW_HEIGHT / 2}
            className="gas-tendency-chart-reference-line"
          />

          {/* Base fee area + line */}
          <path d={areaPath} className="gas-tendency-chart-area" />
          <path d={linePath} className="gas-tendency-chart-line" />

          {/* Hover guide */}
          {hoverIdx !== null && gweis[hoverIdx] !== undefined && (
            <>
              <line
                x1={pointX(hoverIdx)}
                x2={pointX(hoverIdx)}
                y1={0}
                y2={VIEW_HEIGHT}
                className="gas-tendency-chart-guide"
              />
              <circle
                cx={pointX(hoverIdx)}
                cy={pointY(gweis[hoverIdx] as number)}
                r={4}
                className="gas-tendency-chart-dot"
              />
            </>
          )}
        </svg>

        {hoverIdx !== null && gweis[hoverIdx] !== undefined && (
          <div
            className="gas-tendency-chart-tooltip"
            style={{ left: `${((hoverIdx + 0.5) / n) * 100}%` }}
            data-testid="gas-tendency-chart-tooltip"
          >
            <div className="gas-tendency-chart-tooltip-block">
              {t("gasTendency.tooltipBlock", { number: oldestBlock + hoverIdx })}
            </div>
            <div className="gas-tendency-chart-tooltip-row">
              {t("gasTendency.tooltipBaseFee", { value: formatGwei(gweis[hoverIdx] as number) })}
            </div>
            <div className="gas-tendency-chart-tooltip-row">
              {t("gasTendency.tooltipGasUsed", {
                value: ((ratios[hoverIdx] ?? 0) * 100).toFixed(1),
              })}
            </div>
          </div>
        )}
      </div>

      <div className="gas-tendency-chart-axis">
        <span>{t("gasTendency.blockShort", { number: oldestBlock })}</span>
        <span className="gas-tendency-chart-axis-legend">
          <span className="gas-tendency-chart-legend-line" /> {t("gasTendency.baseFee")}
          <span className="gas-tendency-chart-legend-bar" /> {t("gasTendency.gasUsed")}
        </span>
        <span>{t("gasTendency.blockShort", { number: newestBlock })}</span>
      </div>
    </div>
  );
};

export default GasTendencyChart;
