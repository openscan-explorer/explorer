import { useParams } from "react-router-dom";
import { useDataService } from "../../hooks/useDataService";
import { useEffect, useState } from "react";
import SearchBox from "../common/SearchBox";
import NetworkStatsDisplay from "../common/NetworkStatsDisplay";
import Loader from "../common/Loader";
import type { NetworkStats, DataWithMetadata } from "../../types";
import { useProviderSelection } from "../../hooks/useProviderSelection";
import { useSelectedData } from "../../hooks/useSelectedData";

export default function Chain() {
	const { chainId } = useParams<{ chainId?: string }>();
	const numericChainId = Number(chainId) || 1;
	const dataService = useDataService(numericChainId);
	const [networkStatsResult, setNetworkStatsResult] =
		useState<DataWithMetadata<NetworkStats> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Provider selection state
	const [selectedProvider, setSelectedProvider] = useProviderSelection(
		`networkStats_${numericChainId}`,
	);

	// Extract actual network stats based on selected provider
	const networkStats = useSelectedData(networkStatsResult, selectedProvider);

	useEffect(() => {
		if (!dataService) {
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);

		dataService
			.getNetworkStats()
			.then((result) => {
				setNetworkStatsResult(result);
			})
			.catch((err) => {
				setError(err.message || "Failed to fetch network stats");
			})
			.finally(() => setLoading(false));
	}, [dataService]);

	return (
		<div className="home-container">
			<div className="home-content page-card">
				<h1 className="home-title">OPENSCAN</h1>
				<SearchBox />
				{loading && <Loader text="Loading network stats..." />}
				{error && <p className="error-text-center">Error: {error}</p>}
				{networkStats && (
					<NetworkStatsDisplay
						networkStats={networkStats}
						chainId={numericChainId}
						metadata={networkStatsResult?.metadata}
						selectedProvider={selectedProvider}
						onProviderSelect={setSelectedProvider}
					/>
				)}
			</div>
		</div>
	);
}
