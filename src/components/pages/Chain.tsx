import SearchBox from '../common/SearchBox';
import NetworkStatsDisplay from '../common/NetworkStatsDisplay';
import { NetworkStats } from '../../types';

// Mocked network statistics data
const mockNetworkStats: NetworkStats = {
  currentGasPrice: '25000000000', // 25 Gwei
  isSyncing: false,
  hashRate: '250.5 TH/s',
  currentBlockNumber: '18500000',
};

export default function Home() {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">OPENSCAN</h1>
        <SearchBox />

          <NetworkStatsDisplay networkStats={mockNetworkStats} />
      </div>
    </div>
  );
};