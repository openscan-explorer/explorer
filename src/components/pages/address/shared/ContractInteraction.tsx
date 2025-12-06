import { ConnectButton } from "@rainbow-me/rainbowkit";
import type React from "react";
import { useCallback, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { encodeFunctionData, parseEther } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AppContext } from "../../../../context";
import type { ABI, ABIParameter, EventABI, FunctionABI } from "../../../../types";

interface ContractInteractionProps {
  addressHash: string;
  networkId: string;
  abi: ABI[];
}

const ContractInteraction: React.FC<ContractInteractionProps> = ({
  addressHash,
  networkId,
  abi,
}) => {
  const [selectedWriteFunction, setSelectedWriteFunction] = useState<FunctionABI | null>(null);
  const [selectedReadFunction, setSelectedReadFunction] = useState<FunctionABI | null>(null);
  const [functionInputs, setFunctionInputs] = useState<Record<string, string>>({});
  const [readFunctionResult, setReadFunctionResult] = useState<string | null>(null);
  const [isReadingFunction, setIsReadingFunction] = useState(false);
  const { rpcUrls } = useContext(AppContext);

  // Wagmi hooks for contract interaction
  const { data: hash, writeContract, isPending, isError, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleWriteFunction = useCallback(async () => {
    if (!selectedWriteFunction) return;

    try {
      const args: unknown[] = [];
      if (selectedWriteFunction.inputs && selectedWriteFunction.inputs.length > 0) {
        for (const input of selectedWriteFunction.inputs) {
          const paramName = input.name || `param${selectedWriteFunction.inputs.indexOf(input)}`;
          const value = functionInputs[paramName];

          if (!value && value !== "0") {
            alert(`Please provide value for ${paramName}`);
            return;
          }

          args.push(value);
        }
      }

      let txValue: bigint | undefined;
      const valueKey = "_value";
      if (selectedWriteFunction.stateMutability === "payable" && functionInputs[valueKey]) {
        try {
          txValue = parseEther(functionInputs[valueKey]);
        } catch {
          alert("Invalid ETH value");
          return;
        }
      }

      writeContract({
        address: addressHash as `0x${string}`,
        abi: abi,
        functionName: selectedWriteFunction.name,
        args: args,
        value: txValue,
      });
    } catch (err) {
      console.error("Error writing to contract:", err);
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [selectedWriteFunction, functionInputs, addressHash, abi, writeContract]);

  const handleReadFunction = useCallback(async () => {
    if (!selectedReadFunction) return;

    setIsReadingFunction(true);
    setReadFunctionResult(null);

    try {
      const networkIdNum = Number(networkId);
      const rpcUrlsForChain = rpcUrls[networkIdNum as keyof typeof rpcUrls];

      if (!rpcUrlsForChain) {
        throw new Error(`No RPC URL configured for chain ${networkId}`);
      }

      const rpcUrl = Array.isArray(rpcUrlsForChain) ? rpcUrlsForChain[0] : rpcUrlsForChain;

      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for chain ${networkId}`);
      }

      const args: unknown[] = [];
      if (selectedReadFunction.inputs && selectedReadFunction.inputs.length > 0) {
        for (const input of selectedReadFunction.inputs) {
          const paramName = input.name || `param${selectedReadFunction.inputs.indexOf(input)}`;
          const value = functionInputs[paramName];

          if (!value && value !== "0") {
            alert(`Please provide value for ${paramName}`);
            setIsReadingFunction(false);
            return;
          }

          args.push(value);
        }
      }

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_call",
          params: [
            {
              to: addressHash,
              data: encodeFunctionData({
                abi: abi,
                functionName: selectedReadFunction.name,
                args: args,
              }),
            },
            "latest",
          ],
          id: 1,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "Contract call failed");
      }

      setReadFunctionResult(data.result);
    } catch (err) {
      console.error("Error reading from contract:", err);
      setReadFunctionResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsReadingFunction(false);
    }
  }, [selectedReadFunction, functionInputs, addressHash, abi, networkId, rpcUrls]);

  const readFunctions = abi.filter(
    (item: ABI): item is FunctionABI =>
      item.type === "function" &&
      ((item as FunctionABI).stateMutability === "view" ||
        (item as FunctionABI).stateMutability === "pure"),
  );

  const writeFunctions = abi.filter(
    (item: ABI): item is FunctionABI =>
      item.type === "function" &&
      ((item as FunctionABI).stateMutability === "payable" ||
        (item as FunctionABI).stateMutability === "nonpayable" ||
        !(item as FunctionABI).stateMutability),
  );

  const events = abi.filter((item: ABI): item is EventABI => item.type === "event");

  return (
    <div className="tx-row-vertical">
      <div className="contract-functions-header">
        <span className="tx-label">Functions</span>
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
          }: Parameters<Parameters<typeof ConnectButton.Custom>[0]["children"]>[0]) => {
            const ready = mounted && authenticationStatus !== "loading";
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus || authenticationStatus === "authenticated");

            return (
              <div
                {...(!ready && {
                  "aria-hidden": true,
                  className: "wallet-hidden",
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="btn-connect-wallet"
                      >
                        Connect Wallet
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button onClick={openChainModal} type="button" className="btn-wrong-network">
                        Wrong Network
                      </button>
                    );
                  }

                  return (
                    <div className="wallet-connected-container">
                      <button onClick={openChainModal} type="button" className="btn-chain-selector">
                        {chain.hasIcon && chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            className="chain-icon"
                          />
                        )}
                        {chain.name}
                      </button>
                      <button onClick={openAccountModal} type="button" className="btn-account">
                        {account.displayName}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
      <div className="contract-functions-content">
        {/* Read Functions */}
        {readFunctions.length > 0 && (
          <div className="functions-section">
            <div className="functions-section-title functions-section-title-read">
              Read Functions ({readFunctions.length})
            </div>
            <div className="functions-list">
              {readFunctions.map((func: FunctionABI) => (
                <button
                  type="button"
                  key={func.name}
                  onClick={() => {
                    setSelectedReadFunction(func);
                    setSelectedWriteFunction(null);
                    setFunctionInputs({});
                    setReadFunctionResult(null);
                  }}
                  className={`btn-function btn-function-read ${selectedReadFunction?.name === func.name ? "selected" : ""}`}
                >
                  {func.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Write Functions */}
        {writeFunctions.length > 0 && (
          <div className="functions-section">
            <div className="functions-section-title functions-section-title-write">
              Write Functions ({writeFunctions.length})
            </div>
            <div className="functions-list">
              {writeFunctions.map((func: FunctionABI) => (
                <button
                  type="button"
                  key={func.name}
                  onClick={() => {
                    setSelectedWriteFunction(func);
                    setSelectedReadFunction(null);
                    setFunctionInputs({});
                    setReadFunctionResult(null);
                  }}
                  className={`btn-function btn-function-write ${selectedWriteFunction?.name === func.name ? "selected" : ""}`}
                >
                  {func.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div className="functions-section">
            <div className="functions-section-title functions-section-title-events">
              Events ({events.length})
            </div>
            <div className="functions-list">
              {events.slice(0, 10).map((event: EventABI) => (
                <span key={event.name} className="event-badge">
                  {event.name}
                </span>
              ))}
              {events.length > 10 && (
                <span className="events-more">+{events.length - 10} more</span>
              )}
            </div>
          </div>
        )}

        {/* Read Function Form */}
        {selectedReadFunction && (
          <div className="function-form function-form-read">
            <div className="function-form-title function-form-title-read">
              {selectedReadFunction.name}
            </div>

            {selectedReadFunction.inputs && selectedReadFunction.inputs.length > 0 ? (
              <div className="function-inputs">
                {selectedReadFunction.inputs.map((input: ABIParameter, idx: number) => (
                  <label
                    key={`${input.name || idx}-${input.type}`}
                    className="function-input-label"
                  >
                    <span className="function-input-name">
                      {input.name || `param${idx}`} ({input.type})
                    </span>
                    <input
                      type="text"
                      value={functionInputs[input.name || `param${idx}`] || ""}
                      onChange={(e) =>
                        setFunctionInputs({
                          ...functionInputs,
                          [input.name || `param${idx}`]: e.target.value,
                        })
                      }
                      placeholder={`Enter ${input.type}`}
                      className="function-input function-input-read"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="function-no-params">No parameters required</div>
            )}

            {readFunctionResult !== null && (
              <div
                className={`function-result ${readFunctionResult?.startsWith("Error") ? "function-result-error" : "function-result-success"}`}
              >
                <div className="function-result-title">
                  {readFunctionResult?.startsWith("Error") ? "❌ Error" : "✅ Result"}
                </div>
                {readFunctionResult}
              </div>
            )}

            <div className="function-actions">
              <button
                type="button"
                onClick={handleReadFunction}
                disabled={isReadingFunction}
                className="btn-function-action btn-query"
              >
                {isReadingFunction ? "Reading..." : "Query"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedReadFunction(null);
                  setReadFunctionResult(null);
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Write Function Form */}
        {selectedWriteFunction && (
          <div className="function-form function-form-write">
            <div className="function-form-title function-form-title-write">
              {selectedWriteFunction.name}
              {selectedWriteFunction.stateMutability === "payable" && (
                <span className="payable-badge">payable</span>
              )}
            </div>

            {selectedWriteFunction.inputs && selectedWriteFunction.inputs.length > 0 ? (
              <div className="function-inputs">
                {selectedWriteFunction.inputs.map((input: ABIParameter, idx: number) => (
                  <label
                    key={`${input.name || idx}-${input.type}`}
                    className="function-input-label"
                  >
                    <span className="function-input-name">
                      {input.name || `param${idx}`} ({input.type})
                    </span>
                    <input
                      type="text"
                      value={functionInputs[input.name || `param${idx}`] || ""}
                      onChange={(e) =>
                        setFunctionInputs({
                          ...functionInputs,
                          [input.name || `param${idx}`]: e.target.value,
                        })
                      }
                      placeholder={`Enter ${input.type}`}
                      className="function-input function-input-write"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="function-no-params">No parameters required</div>
            )}

            {selectedWriteFunction.stateMutability === "payable" && (
              <label className="function-input-label">
                <span className="function-input-name">Value (ETH)</span>
                <input
                  type="text"
                  // biome-ignore lint/complexity/useLiteralKeys: _value is a special key for ETH value
                  value={functionInputs["_value"] || ""}
                  onChange={(e) =>
                    setFunctionInputs({
                      ...functionInputs,
                      _value: e.target.value,
                    })
                  }
                  placeholder="0.0"
                  className="function-input function-input-value"
                />
              </label>
            )}

            {/* Transaction Status */}
            {(isPending || isConfirming || isConfirmed || isError) && (
              <div
                className={`tx-status-box ${isError ? "tx-status-error" : isConfirmed ? "tx-status-success" : "tx-status-pending"}`}
              >
                {isPending && "⏳ Waiting for wallet confirmation..."}
                {isConfirming && "⏳ Waiting for transaction confirmation..."}
                {isConfirmed && (
                  <div>
                    ✅ Transaction confirmed!
                    {hash && (
                      <div className="tx-hash-link">
                        <Link to={`/${networkId}/tx/${hash}`}>View transaction</Link>
                      </div>
                    )}
                  </div>
                )}
                {isError && <div>❌ Error: {error?.message || "Transaction failed"}</div>}
              </div>
            )}

            <div className="function-actions">
              <button
                type="button"
                onClick={handleWriteFunction}
                disabled={isPending || isConfirming}
                className="btn-function-action btn-write-action"
              >
                {isPending ? "Confirming in Wallet..." : isConfirming ? "Processing..." : "Write"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedWriteFunction(null)}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractInteraction;
