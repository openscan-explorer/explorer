import type React from "react";
import { useState } from "react";
import { type Hex, parseEther, parseGwei } from "viem";
import { useAccount, useSendTransaction, useSignMessage, useSignTypedData } from "wagmi";

type SignMode = "personal" | "typed" | "transaction";

const MessageSigner: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: isSigningMessage } = useSignMessage();
  const { signTypedDataAsync, isPending: isSigningTypedData } = useSignTypedData();
  const { sendTransactionAsync, isPending: isSendingTx } = useSendTransaction();

  const [signMode, setSignMode] = useState<SignMode>("personal");
  const [showSigner, setShowSigner] = useState(false);

  // Personal sign state
  const [personalMessage, setPersonalMessage] = useState("");

  // Typed data state
  const [typedDataInput, setTypedDataInput] = useState(
    JSON.stringify(
      {
        domain: {
          name: "OpenScan",
          version: "1",
          chainId: 1,
          verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
        },
        types: {
          PaymentConfirmation: [
            { name: "txHash", type: "bytes32" },
            { name: "message", type: "string" },
          ],
        },
        primaryType: "PaymentConfirmation",
        message: {
          txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          message: "I confirm this payment",
        },
      },
      null,
      2,
    ),
  );

  // Transaction state
  const [txTo, setTxTo] = useState("");
  const [txValue, setTxValue] = useState("");
  const [txData, setTxData] = useState("");
  const [txGasLimit, setTxGasLimit] = useState("");
  const [txGasPrice, setTxGasPrice] = useState("");

  // Results
  const [signature, setSignature] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const clearResults = () => {
    setSignature("");
    setTxHash("");
    setError("");
  };

  const handlePersonalSign = async () => {
    clearResults();
    try {
      if (!personalMessage) {
        setError("Please enter a message to sign");
        return;
      }
      const sig = await signMessageAsync({ message: personalMessage });
      setSignature(sig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign message");
    }
  };

  const handleTypedDataSign = async () => {
    clearResults();
    try {
      const parsed = JSON.parse(typedDataInput);
      const { domain, types, primaryType, message } = parsed;

      if (!domain || !types || !primaryType || !message) {
        setError("JSON must contain domain, types, primaryType, and message fields");
        return;
      }

      // Remove EIP712Domain from types if present (wagmi handles it automatically)
      const typesWithoutDomain = { ...types };
      delete typesWithoutDomain.EIP712Domain;

      const sig = await signTypedDataAsync({
        domain,
        types: typesWithoutDomain,
        primaryType,
        message,
      });
      setSignature(sig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign typed data");
    }
  };

  const handleSendTransaction = async () => {
    clearResults();
    try {
      if (!txTo) {
        setError("Please enter a recipient address");
        return;
      }

      const txParams: {
        to: Hex;
        value?: bigint;
        data?: Hex;
        gas?: bigint;
        gasPrice?: bigint;
      } = {
        to: txTo as Hex,
      };

      if (txValue) {
        txParams.value = parseEther(txValue);
      }

      if (txData) {
        txParams.data = txData as Hex;
      }

      if (txGasLimit) {
        txParams.gas = BigInt(txGasLimit);
      }

      if (txGasPrice) {
        txParams.gasPrice = parseGwei(txGasPrice);
      }

      const hash = await sendTransactionAsync(txParams);
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send transaction");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isPending = isSigningMessage || isSigningTypedData || isSendingTx;

  return (
    <div className="devtools-card">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: toggle header */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: toggle header */}
      <div
        className="devtools-tool-header cursor-pointer"
        onClick={() => setShowSigner(!showSigner)}
      >
        <h3 className="devtools-tool-title">✍️ Message Signer</h3>
        <span className="devtools-section-toggle">{showSigner ? "▼" : "▶"}</span>
      </div>

      {showSigner && (
        <div className="devtools-flex-column devtools-gap-12">
          {/* Wallet Connection Status */}
          <div className={`signer-wallet-status ${isConnected ? "connected" : "disconnected"}`}>
            {isConnected ? (
              <>
                <span className="signer-status-indicator connected" />
                <span>
                  Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </>
            ) : (
              <>
                <span className="signer-status-indicator disconnected" />
                <span>Wallet not connected. Please connect your wallet to sign.</span>
              </>
            )}
          </div>

          {/* Mode Toggle */}
          <div className="keccak-mode-toggle">
            {/* biome-ignore lint/a11y/useButtonType: mode toggle */}
            <button
              className={`keccak-mode-btn ${signMode === "personal" ? "active" : ""}`}
              onClick={() => {
                setSignMode("personal");
                clearResults();
              }}
            >
              Personal Sign
            </button>
            {/* biome-ignore lint/a11y/useButtonType: mode toggle */}
            <button
              className={`keccak-mode-btn ${signMode === "typed" ? "active" : ""}`}
              onClick={() => {
                setSignMode("typed");
                clearResults();
              }}
            >
              Typed Data (EIP-712)
            </button>
            {/* biome-ignore lint/a11y/useButtonType: mode toggle */}
            <button
              className={`keccak-mode-btn ${signMode === "transaction" ? "active" : ""}`}
              onClick={() => {
                setSignMode("transaction");
                clearResults();
              }}
            >
              Send Transaction
            </button>
          </div>

          {/* Personal Sign Mode */}
          {signMode === "personal" && (
            <div className="devtools-flex-column devtools-gap-12">
              <div className="devtools-flex-column devtools-gap-4">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: label association */}
                <label className="input-label">Message to Sign</label>
                <textarea
                  placeholder="Enter your message here..."
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  className="devtools-input sig-message-textarea"
                  disabled={!isConnected}
                />
              </div>
              <p className="signer-hint">
                Uses EIP-191 personal_sign. The message will be prefixed with "\x19Ethereum Signed
                Message:\n" before signing.
              </p>
              {/* biome-ignore lint/a11y/useButtonType: action button */}
              <button
                onClick={handlePersonalSign}
                className="devtools-button"
                disabled={!isConnected || isPending}
              >
                {isSigningMessage ? "Signing..." : "Sign Message"}
              </button>
            </div>
          )}

          {/* Typed Data Mode */}
          {signMode === "typed" && (
            <div className="devtools-flex-column devtools-gap-12">
              <div className="devtools-flex-column devtools-gap-4">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: label association */}
                <label className="input-label">
                  EIP-712 Typed Data (domain, types, primaryType, message)
                </label>
                <textarea
                  placeholder='{"domain": {...}, "types": {...}, "primaryType": "...", "message": {...}}'
                  value={typedDataInput}
                  onChange={(e) => setTypedDataInput(e.target.value)}
                  className="devtools-input mono eip712-input-textarea"
                  disabled={!isConnected}
                />
              </div>
              <p className="signer-hint">
                Uses EIP-712 eth_signTypedData_v4. Structured data signing with domain separation
                for better security and UX.
              </p>
              {/* biome-ignore lint/a11y/useButtonType: action button */}
              <button
                onClick={handleTypedDataSign}
                className="devtools-button"
                disabled={!isConnected || isPending}
              >
                {isSigningTypedData ? "Signing..." : "Sign Typed Data"}
              </button>
            </div>
          )}

          {/* Transaction Mode */}
          {signMode === "transaction" && (
            <div className="devtools-flex-column devtools-gap-12">
              <div className="signer-tx-grid">
                <div className="devtools-flex-column devtools-gap-4">
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: label association */}
                  <label className="input-label">To Address *</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={txTo}
                    onChange={(e) => setTxTo(e.target.value)}
                    className="devtools-input"
                    disabled={!isConnected}
                  />
                </div>
                <div className="devtools-flex-column devtools-gap-4">
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: label association */}
                  <label className="input-label">Value (ETH)</label>
                  <input
                    type="text"
                    placeholder="0.0"
                    value={txValue}
                    onChange={(e) => setTxValue(e.target.value)}
                    className="devtools-input"
                    disabled={!isConnected}
                  />
                </div>
              </div>

              <div className="devtools-flex-column devtools-gap-4">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: label association */}
                <label className="input-label">Data (hex)</label>
                <textarea
                  placeholder="0x..."
                  value={txData}
                  onChange={(e) => setTxData(e.target.value)}
                  className="devtools-input"
                  style={{ minHeight: "60px" }}
                  disabled={!isConnected}
                />
              </div>

              <div className="signer-tx-grid">
                <div className="devtools-flex-column devtools-gap-4">
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: label association */}
                  <label className="input-label">Gas Limit (optional)</label>
                  <input
                    type="text"
                    placeholder="21000"
                    value={txGasLimit}
                    onChange={(e) => setTxGasLimit(e.target.value)}
                    className="devtools-input"
                    disabled={!isConnected}
                  />
                </div>
                <div className="devtools-flex-column devtools-gap-4">
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: label association */}
                  <label className="input-label">Gas Price (Gwei, optional)</label>
                  <input
                    type="text"
                    placeholder="Auto"
                    value={txGasPrice}
                    onChange={(e) => setTxGasPrice(e.target.value)}
                    className="devtools-input"
                    disabled={!isConnected}
                  />
                </div>
              </div>

              <p className="signer-hint">
                Signs and broadcasts a raw transaction. The wallet will prompt for confirmation
                before sending.
              </p>
              {/* biome-ignore lint/a11y/useButtonType: action button */}
              <button
                onClick={handleSendTransaction}
                className="devtools-button"
                disabled={!isConnected || isPending}
              >
                {isSendingTx ? "Sending..." : "Send Transaction"}
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="devtools-error">
              <span>{error}</span>
              {/* biome-ignore lint/a11y/useButtonType: dismiss button */}
              <button className="devtools-error-dismiss" onClick={() => setError("")}>
                ✕
              </button>
            </div>
          )}

          {/* Signature Result */}
          {signature && (
            <div className="devtools-results">
              <div className="signer-result-header">
                <span className="sig-result-label">Signature</span>
                {/* biome-ignore lint/a11y/useButtonType: copy button */}
                <button className="devtools-copy-btn" onClick={() => copyToClipboard(signature)}>
                  Copy
                </button>
              </div>
              <div className="sig-result-value mono signer-signature-value">{signature}</div>
            </div>
          )}

          {/* Transaction Hash Result */}
          {txHash && (
            <div className="devtools-results">
              <div className="signer-result-header">
                <span className="sig-result-label">Transaction Hash</span>
                {/* biome-ignore lint/a11y/useButtonType: copy button */}
                <button className="devtools-copy-btn" onClick={() => copyToClipboard(txHash)}>
                  Copy
                </button>
              </div>
              <div className="sig-result-value mono">{txHash}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageSigner;
