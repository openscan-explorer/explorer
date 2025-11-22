import { useParams } from 'react-router-dom';
import { useDataService } from '../../hooks/useDataService';
import { useEffect, useState } from 'react';
import { Block } from '../../types';

export default function Blocks() {
  const { chainId } = useParams<{ chainId?: string }>();
  const dataService = useDataService(Number(chainId) || 1);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService) {
      setLoading(false);
      return;
    }

    console.log('Fetching latest 10 blocks for chain:', chainId);
    setLoading(true);
    setError(null);

    dataService
      .getLatestBlocks(10)
      .then(fetchedBlocks => {
        console.log('Fetched blocks:', fetchedBlocks);
        setBlocks(fetchedBlocks);
      })
      .catch((err) => {
        console.error('Error fetching blocks:', err);
        setError(err.message || 'Failed to fetch blocks');
      })
      .finally(() => setLoading(false));
  }, [dataService, chainId]);

  if (loading) {
    return (
      <div>
        <h1>Latest Blocks</h1>
        <p>chainId: {chainId ?? 'none'}</p>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Latest Blocks</h1>
        <p>chainId: {chainId ?? 'none'}</p>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Latest Blocks</h1>
      <p>chainId: {chainId ?? 'none'}</p>
      <p>Showing {blocks.length} most recent blocks</p>
      
      {blocks.map((block, index) => (
        <div key={block.number} style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
          <h2>Block #{block.number}</h2>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '1rem', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '0.875rem'
          }}>
            {JSON.stringify(block, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}
