import { useParams } from 'react-router-dom';
import { useDataService } from '../../hooks/useDataService';
import { useEffect, useState } from 'react';
import { Block } from '../../types';
import BlockDisplay from '../common/BlockDisplay';

export default function Block() {
  const { chainId, filter } = useParams<{ chainId?: string; filter?: string }>();
  const { chainId: chainIdParam, blockNumber: blockNumberParam } = useParams<{
    chainId: string;
    blockNumber: string;
  }>();
  
  const blockNumber = filter == "latest" ? "latest" : Number(filter);
  
  const dataService = useDataService(Number(chainId) || 1);
  const [block, setBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || blockNumber === undefined) {
      setLoading(false);
      return;
    }
    
    console.log('Fetching block:', blockNumber);
    setLoading(true);
    setError(null);
    
    dataService
      .getBlock(blockNumber)
      .then(fetchedBlock => {
        console.log('Fetched block:', fetchedBlock);
        setBlock(fetchedBlock);
      })
      .catch((err) => {
        console.error('Error fetching block:', err);
        setError(err.message || 'Failed to fetch block');
      })
      .finally(() => setLoading(false));
  }, [dataService, blockNumber]);

  if (loading) {
    return (
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', color: '#059669', marginBottom: '1rem' }}>Block</h1>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', color: '#059669', marginBottom: '1rem' }}>Block</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>     
      {block ? (
        <>
          <BlockDisplay block={block} />
        </>
      ) : (
        <p>Block not found</p>
      )}
    </div>
  );
}
