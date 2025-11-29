import React, { useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "../../context";
import { ENSService } from "../../services/ENS/ENSService";

const SearchBox = () => {
	const [searchTerm, setSearchTerm] = useState("");
	const [isResolving, setIsResolving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const location = useLocation();
	const { rpcUrls } = useContext(AppContext);

	// Extract chainId from the pathname (e.g., /1/blocks -> 1)
	const pathSegments = location.pathname.split("/").filter(Boolean);
	const chainId =
		pathSegments[0] && !isNaN(Number(pathSegments[0]))
			? pathSegments[0]
			: undefined;

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchTerm.trim()) return;

		const term = searchTerm.trim();
		setError(null);

		// Check if it's an ENS name
		if (ENSService.isENSName(term)) {
			setIsResolving(true);
			try {
				// ENS resolution only works on mainnet (chainId 1)
				// Use mainnet RPC even if viewing a different chain
				const mainnetRpcUrls = rpcUrls[1];

				if (!mainnetRpcUrls || mainnetRpcUrls.length === 0) {
					setError("No Ethereum mainnet RPC configured");
					setIsResolving(false);
					return;
				}

				// Pass all RPC URLs for fallback support
				const ensService = new ENSService(mainnetRpcUrls);
				const resolvedAddress = await ensService.resolve(term);

				if (resolvedAddress) {
					// Navigate to address page on the current chain (or mainnet if no chain selected)
					const targetChainId = chainId || "1";
					navigate(`/${targetChainId}/address/${resolvedAddress}`, {
						state: { ensName: term },
					});
				} else {
					setError(`Could not resolve ENS name: ${term}`);
				}
			} catch (err) {
				setError(
					`Error resolving ENS: ${err instanceof Error ? err.message : "Unknown error"}`,
				);
			} finally {
				setIsResolving(false);
			}
			return;
		}

		// Standard search logic for hex addresses/hashes
		if (term.startsWith("0x")) {
			if (term.length === 42) {
				navigate(`/${chainId}/address/${term}`);
			} else if (term.length === 66) {
				navigate(`/${chainId}/tx/${term}`);
			}
		} else if (!isNaN(Number(term))) {
			navigate(`/${chainId}/block/${term}`);
		}
	};

	return (
		<div className="search-box-container">
			<form onSubmit={handleSearch} className="search-form">
				<input
					type="text"
					className="search-input"
					placeholder="Search by Address / Txn Hash / Block / ENS Name"
					value={searchTerm}
					onChange={(e) => {
						setSearchTerm(e.target.value);
						setError(null);
					}}
					disabled={isResolving}
				/>
				<button
					type="submit"
					className="search-button"
					disabled={isResolving}
				>
					{isResolving ? "..." : "Scan"}
				</button>
			</form>
			{error && (
				<div
					style={{
						color: "#ef4444",
						fontSize: "0.85rem",
						marginTop: "8px",
						padding: "8px 12px",
						background: "rgba(239, 68, 68, 0.1)",
						borderRadius: "6px",
					}}
				>
					{error}
				</div>
			)}
		</div>
	);
};

export default SearchBox;
