import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { ContractInfo } from "../../../../../utils/contractLookup";
import { formatDecodedValue } from "../../../../../utils/eventDecoder";
import { type DecodedInput, decodeFunctionCall } from "../../../../../utils/inputDecoder";

const InputDataTab: React.FC<{
  inputData: string;
  decodedInput: DecodedInput | null;
  networkId: string;
  contracts: Record<string, ContractInfo>;
  txToAddress?: string;
}> = ({ inputData, decodedInput, networkId, contracts, txToAddress }) => {
  const { t } = useTranslation("transaction");

  // Try enriched ABI decode if no decoded input from sourcify/local
  const resolved =
    decodedInput ??
    (() => {
      if (!txToAddress || !inputData || inputData === "0x") return null;
      const enriched = contracts[txToAddress.toLowerCase()];
      if (!enriched?.abi) return null;
      return decodeFunctionCall(inputData, enriched.abi);
    })();

  return (
    <div className="analyser-tab-content">
      {resolved && (
        <div className="analyser-input-decoded">
          <div className="analyser-summary">
            <span>{t("decodedInput")}</span>
          </div>
          <div className="tx-decoded-input">
            <div className="tx-decoded-function">
              <span className="tx-function-signature">{resolved.signature}</span>
            </div>
            {resolved.params.length > 0 && (
              <div className="tx-decoded-params">
                {resolved.params.map((param, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: params have stable order
                  <div key={i} className="tx-decoded-param">
                    <span className="tx-param-name">{param.name}</span>
                    <span className="tx-param-type">({param.type})</span>
                    <span className={`tx-param-value ${param.type === "address" ? "tx-mono" : ""}`}>
                      {param.type === "address" ? (
                        <Link to={`/${networkId}/address/${param.value}`} className="link-accent">
                          {param.value}
                        </Link>
                      ) : (
                        formatDecodedValue(param.value, param.type)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="analyser-input-raw">
        <div className="analyser-summary">
          <span>{t("analyser.rawInputData")}</span>
        </div>
        <div className="tx-input-data">
          <code>{inputData}</code>
        </div>
      </div>
    </div>
  );
};

export default InputDataTab;
