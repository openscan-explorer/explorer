import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { keccak256, toUtf8Bytes, hexlify, AbiCoder, solidityPackedKeccak256 } from "ethers";
import Artifacts from "../common/HH3IgnitionTool";

type Section =
	| "transactions"
	| "signatures"
	| "contracts"
	| "utils"
	| "development";

// Supported Solidity types for abi.encodePacked
type SolidityType = "string" | "bytes" | "address" | "uint256" | "uint128" | "uint64" | "uint32" | "uint8" | "int256" | "bool" | "bytes32" | "bytes4";

const DevTools: React.FC = () => {
	const { chainId } = useParams<{ chainId?: string }>();

	// Active section state
	const [activeSection, setActiveSection] = useState<Section>("utils");

	// State for different tools
	const [encodedData, setEncodedData] = useState("");
	const [decodedData, setDecodedData] = useState("");
	const [ethAmount, setEthAmount] = useState("");
	const [gweiAmount, setGweiAmount] = useState("");
	const [weiAmount, setWeiAmount] = useState("");

	const [blockResult, setBlockResult] = useState<any>(null);
	const [txResult, setTxResult] = useState<any>(null);
	const [addressResult, setAddressResult] = useState<any>(null);
	const [error, setError] = useState("");

	// Keccak tool state
	const [keccakInput, setKeccakInput] = useState("");
	const [keccakInputType, setKeccakInputType] = useState<SolidityType>("string");
	const [keccakResults, setKeccakResults] = useState<{
		encodedBytes?: string;
		rawHash?: string;
		solidityEncodePacked?: string;
		solidityEncode?: string;
		functionSelector?: string | null;
		isFunctionSignature?: boolean;
		error?: string;
	} | null>(null);

	// Parse input value based on selected type
	const parseInputValue = (input: string, type: SolidityType): any => {
		const trimmed = input.trim();
		switch (type) {
			case "string":
				return trimmed;
			case "bytes":
			case "bytes32":
			case "bytes4":
				// Expect hex input
				return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
			case "address":
				// Validate and return address
				if (!/^0x[0-9a-fA-F]{40}$/i.test(trimmed) && !/^[0-9a-fA-F]{40}$/i.test(trimmed)) {
					throw new Error("Invalid address format (expected 40 hex chars)");
				}
				return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
			case "uint256":
			case "uint128":
			case "uint64":
			case "uint32":
			case "uint8":
			case "int256":
				// Parse as BigInt for large numbers
				return BigInt(trimmed);
			case "bool":
				return trimmed.toLowerCase() === "true" || trimmed === "1";
			default:
				return trimmed;
		}
	};

	// Compute keccak hash on button click
	const computeKeccak = () => {
		if (!keccakInput.trim()) {
			setKeccakResults(null);
			return;
		}

		try {
			const abiCoder = AbiCoder.defaultAbiCoder();
			
			// Parse the input based on selected type
			const parsedValue = parseInputValue(keccakInput, keccakInputType);
			
			// Get raw bytes for display (UTF-8 for string, hex for others)
			let encodedHex: string;
			if (keccakInputType === "string") {
				encodedHex = hexlify(toUtf8Bytes(keccakInput));
			} else if (typeof parsedValue === "bigint") {
				// For numeric types, show the hex representation
				encodedHex = "0x" + parsedValue.toString(16).padStart(64, "0");
			} else {
				encodedHex = parsedValue;
			}

			// Raw keccak256 hash (of the string bytes directly - for function signatures)
			const rawBytes = toUtf8Bytes(keccakInput);
			const rawHash = keccak256(rawBytes);

			// Solidity keccak256(abi.encodePacked(type, value))
			const solidityEncodePacked = solidityPackedKeccak256([keccakInputType], [parsedValue]);

			// Solidity keccak256(abi.encode(type, value))
			const abiEncoded = abiCoder.encode([keccakInputType], [parsedValue]);
			const solidityEncode = keccak256(abiEncoded);

			// Check if input looks like a function signature (only relevant for string type)
			const functionSigPattern = /^[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)$/;
			const isFunctionSignature = keccakInputType === "string" && functionSigPattern.test(keccakInput.trim());
			const functionSelector = isFunctionSignature ? rawHash.slice(0, 10) : null;

			setKeccakResults({
				encodedBytes: encodedHex,
				rawHash,
				solidityEncodePacked,
				solidityEncode,
				functionSelector,
				isFunctionSignature,
			});
		} catch (err: any) {
			setKeccakResults({ error: err.message || "Failed to compute hash" });
		}
	};

	const convertToHex = (data: string) => {
		try {
			// Try to convert various formats to hex
			if (data.startsWith("0x")) {
				setDecodedData(data);
				return;
			}

			// Convert string to hex
			const hex =
				"0x" +
				Array.from(data)
					.map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
					.join("");
			setDecodedData(hex);
		} catch (err: any) {
			setError(err.message || "Failed to convert to hex");
		}
	};

	const convertFromHex = (hexData: string) => {
		try {
			if (!hexData.startsWith("0x")) {
				setError("Invalid hex format (must start with 0x)");
				return;
			}

			const hex = hexData.slice(2);
			const str =
				hex
					.match(/.{1,2}/g)
					?.map((byte) => String.fromCharCode(parseInt(byte, 16)))
					.join("") || "";
			setDecodedData(str);
		} catch (err: any) {
			setError(err.message || "Failed to decode hex");
		}
	};

	const convertEth = (value: string, from: "eth" | "gwei" | "wei") => {
		try {
			const num = parseFloat(value);
			if (isNaN(num)) return;

			switch (from) {
				case "eth":
					setGweiAmount((num * 1e9).toString());
					setWeiAmount((num * 1e18).toString());
					break;
				case "gwei":
					setEthAmount((num / 1e9).toString());
					setWeiAmount((num * 1e9).toString());
					break;
				case "wei":
					setEthAmount((num / 1e18).toString());
					setGweiAmount((num / 1e9).toString());
					break;
			}
		} catch (err: any) {
			setError(err.message || "Failed to convert");
		}
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
	};

	const clearAll = () => {
		setBlockResult(null);
		setTxResult(null);
		setAddressResult(null);
		setError("");
	};

	return (
		<div className="container-wide devtools-container">
			{/* Section Tabs */}
			<div className="devtools-tabs">
				<button
					className={`devtools-tab ${activeSection === "transactions" ? "active" : ""}`}
					onClick={() => setActiveSection("transactions")}
				>
					Transactions
				</button>
				<button
					className={`devtools-tab ${activeSection === "signatures" ? "active" : ""}`}
					onClick={() => setActiveSection("signatures")}
				>
					Signatures
				</button>
				<button
					className={`devtools-tab ${activeSection === "contracts" ? "active" : ""}`}
					onClick={() => setActiveSection("contracts")}
				>
					Contracts
				</button>
				<button
					className={`devtools-tab ${activeSection === "utils" ? "active" : ""}`}
					onClick={() => setActiveSection("utils")}
				>
					Utils
				</button>
				<button
					className={`devtools-tab ${activeSection === "development" ? "active" : ""}`}
					onClick={() => setActiveSection("development")}
				>
					Development
				</button>
			</div>

			{/* Error Display */}
			{error && (
				<div className="devtools-error">
					⚠️ {error}
					<button
						onClick={() => setError("")}
						className="devtools-error-dismiss"
					>
						✕
					</button>
				</div>
			)}

			{/* Transactions Section */}
			{activeSection === "transactions" && (
				<div className="devtools-section">
					<div className="devtools-coming-soon">
						<span className="devtools-coming-soon-icon">🔄</span>
						<h3>Transaction Tools</h3>
						<p>More tools coming soon</p>
					</div>
				</div>
			)}

			{/* Signatures Section */}
			{activeSection === "signatures" && (
				<div className="devtools-section">
					<div className="devtools-coming-soon">
						<span className="devtools-coming-soon-icon">✍️</span>
						<h3>Signature Tools</h3>
						<p>More tools coming soon</p>
					</div>
				</div>
			)}

			{/* Contracts Section */}
			{activeSection === "contracts" && (
				<div className="devtools-section">
					<div className="devtools-coming-soon">
						<span className="devtools-coming-soon-icon">📄</span>
						<h3>Contract Tools</h3>
						<p>More tools coming soon</p>
					</div>
				</div>
			)}

			{/* Utils Section */}
			{activeSection === "utils" && (
				<div className="devtools-section">
					{/* Unit Converter */}
					<div className="devtools-card">
						<h3 className="devtools-tool-title">
							💱 Unit Converter (ETH ⟷ Gwei ⟷ Wei)
						</h3>
						<div className="data-grid-3">
							<div>
								<label className="devtools-input-label">ETH</label>
								<input
									type="text"
									placeholder="1.5"
									value={ethAmount}
									onChange={(e) => {
										setEthAmount(e.target.value);
										convertEth(e.target.value, "eth");
									}}
									className="devtools-input"
								/>
							</div>
							<div>
								<label className="devtools-input-label">Gwei</label>
								<input
									type="text"
									placeholder="1500000000"
									value={gweiAmount}
									onChange={(e) => {
										setGweiAmount(e.target.value);
										convertEth(e.target.value, "gwei");
									}}
									className="devtools-input"
								/>
							</div>
							<div>
								<label className="devtools-input-label">Wei</label>
								<input
									type="text"
									placeholder="1500000000000000000"
									value={weiAmount}
									onChange={(e) => {
										setWeiAmount(e.target.value);
										convertEth(e.target.value, "wei");
									}}
									className="devtools-input"
								/>
							</div>
						</div>
					</div>

					{/* Keccak256 Tool */}
					<div className="devtools-card">
						<h3 className="devtools-tool-title">#️⃣ Keccak256 Hasher</h3>
						<div className="flex-column" style={{ gap: "12px" }}>
							{/* Type selector and input on same line */}
							<div className="keccak-input-row">
								<select
									value={keccakInputType}
									onChange={(e) => setKeccakInputType(e.target.value as SolidityType)}
									className="devtools-select keccak-type-select"
								>
									<optgroup label="Dynamic Types">
										<option value="string">string</option>
										<option value="bytes">bytes</option>
									</optgroup>
									<optgroup label="Fixed Types">
										<option value="address">address</option>
										<option value="bool">bool</option>
										<option value="bytes32">bytes32</option>
										<option value="bytes4">bytes4</option>
									</optgroup>
									<optgroup label="Numeric Types">
										<option value="uint256">uint256</option>
										<option value="uint128">uint128</option>
										<option value="uint64">uint64</option>
										<option value="uint32">uint32</option>
										<option value="uint8">uint8</option>
										<option value="int256">int256</option>
									</optgroup>
								</select>
								<input
									type="text"
									placeholder={
										keccakInputType === "string" ? "Enter text (e.g., transfer(address,uint256))" :
										keccakInputType === "address" ? "Enter address (0x...)" :
										keccakInputType === "bool" ? "Enter true/false or 1/0" :
										keccakInputType.startsWith("uint") || keccakInputType.startsWith("int") ? "Enter number" :
										"Enter hex value (0x...)"
									}
									value={keccakInput}
									onChange={(e) => setKeccakInput(e.target.value)}
									className="devtools-input"
								/>
							</div>

							<button
								onClick={computeKeccak}
								className="devtools-btn"
							>
								Hash
							</button>

							{/* Results */}
							{keccakResults && !keccakResults.error && keccakResults.rawHash && (
								<div className="keccak-results">
									{/* Encoded Bytes - show for all types */}
									{keccakResults.encodedBytes && (
										<div className="keccak-result-item">
											<div className="keccak-result-header">
												<span className="keccak-result-label">Encoded Bytes</span>
												<button
													onClick={() => copyToClipboard(keccakResults.encodedBytes!)}
													className="devtools-copy-btn"
												>
													📋
												</button>
											</div>
											<div className="keccak-result-value">{keccakResults.encodedBytes}</div>
										</div>
									)}

									{/* Raw Keccak256 Hash */}
									<div className="keccak-result-item">
										<div className="keccak-result-header">
											<span className="keccak-result-label">Keccak256 Hash</span>
											<button
												onClick={() => copyToClipboard(keccakResults.rawHash!)}
												className="devtools-copy-btn"
											>
												📋
											</button>
										</div>
										<div className="keccak-result-value">{keccakResults.rawHash}</div>
									</div>

									{/* Solidity abi.encodePacked */}
									<div className="keccak-result-item">
										<div className="keccak-result-header">
											<span className="keccak-result-label">keccak256(abi.encodePacked(input))</span>
											<button
												onClick={() => copyToClipboard(keccakResults.solidityEncodePacked!)}
												className="devtools-copy-btn"
											>
												📋
											</button>
										</div>
										<div className="keccak-result-value">{keccakResults.solidityEncodePacked}</div>
									</div>

									{/* Solidity abi.encode */}
									<div className="keccak-result-item">
										<div className="keccak-result-header">
											<span className="keccak-result-label">keccak256(abi.encode(input))</span>
											<button
												onClick={() => copyToClipboard(keccakResults.solidityEncode!)}
												className="devtools-copy-btn"
											>
												📋
											</button>
										</div>
										<div className="keccak-result-value">{keccakResults.solidityEncode}</div>
									</div>

									{/* Function Selector (if applicable) */}
									{keccakResults.isFunctionSignature && keccakResults.functionSelector && (
										<div className="keccak-result-item keccak-selector">
											<div className="keccak-result-header">
												<span className="keccak-result-label">
													🎯 Function Selector (bytes4)
												</span>
												<button
													onClick={() => copyToClipboard(keccakResults.functionSelector!)}
													className="devtools-copy-btn"
												>
													📋
												</button>
											</div>
											<div className="keccak-result-value keccak-selector-value">
												{keccakResults.functionSelector}
											</div>
										</div>
									)}
								</div>
							)}

							{/* Error display */}
							{keccakResults?.error && (
								<div className="keccak-error">
									⚠️ {keccakResults.error}
								</div>
							)}
						</div>
					</div>

					{/* Hex Encoder/Decoder */}
					<div className="devtools-card">
						<h3 className="devtools-tool-title">🔤 Hex Encoder/Decoder</h3>
						<div className="flex-column" style={{ gap: "12px" }}>
							<textarea
								placeholder="Enter text or hex data"
								value={encodedData}
								onChange={(e) => setEncodedData(e.target.value)}
								className="devtools-textarea"
							/>
							<div className="flex-between" style={{ gap: "12px" }}>
								<button
									onClick={() => convertToHex(encodedData)}
									className="devtools-btn"
								>
									Encode to Hex
								</button>
								<button
									onClick={() => convertFromHex(encodedData)}
									className="devtools-btn"
								>
									Decode from Hex
								</button>
							</div>
							{decodedData && (
								<div className="devtools-result">
									<div className="devtools-result-header">
										<span className="devtools-result-label">Result:</span>
										<button
											onClick={() => copyToClipboard(decodedData)}
											className="devtools-copy-btn"
										>
											📋 Copy
										</button>
									</div>
									<div className="devtools-result-value">{decodedData}</div>
								</div>
							)}
						</div>
					</div>

					{/* Results Section */}
					{(blockResult || txResult || addressResult) && (
						<div className="devtools-card">
							<div className="flex-between mb-medium">
								<h3 className="devtools-tool-title-inline">📊 Results</h3>
								<button onClick={clearAll} className="devtools-clear-btn">
									Clear All
								</button>
							</div>
							<pre className="devtools-results-pre">
								{JSON.stringify(
									blockResult || txResult || addressResult,
									null,
									2,
								)}
							</pre>
						</div>
					)}
				</div>
			)}

			{/* Development Section */}
			{activeSection === "development" && (
				<div className="devtools-section">
					{/* Hardhat Artifacts Section */}
					<Artifacts />
				</div>
			)}
		</div>
	);
};

export default DevTools;
