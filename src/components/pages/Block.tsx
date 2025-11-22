import { useParams } from 'react-router-dom';
import { useDataService } from '../../hooks/useDataService';
import { useEffect, useState } from 'react';
import { Block } from '../../types';

export default function Block() {
  const { chainId, filter } = useParams<{ chainId?: string; filter?: string }>();
  const { chainId: chainIdParam, blockNumber: blockNumberParam } = useParams<{
    chainId: string;
    blockNumber: string;
  }>();
  
  const blockNumber = filter == "latest" ? "latest" : Number(filter);
  
  const dataService = useDataService(1);
  const [block, setBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataService
    .getBlock(blockNumber)
    .then(fetchedBlock => {
      console.log('Fetched block:', fetchedBlock);
      setBlock(fetchedBlock);
    })
    .catch((err) => {
      console.error('Error fetching block:', err);
    })
    .finally(() => setLoading(false));

    if (!dataService || blockNumber === undefined) {
      setLoading(false);
      return;
    }
    console.log('Fetching block:', blockNumber);

    setLoading(true);
    
  }, [dataService, blockNumber]);

  return (
    <div>
      <h1>Block</h1>
      <p>chainId: {chainId ?? 'none'}</p>
      <p>filter: {filter ?? 'none'}</p>
      <pre>{block ? JSON.stringify(block, null, 2) : 'Loading...'}</pre>
    </div>
  );
}
