import { useParams } from 'react-router-dom';
import { useDataService } from '../../hooks/useDataService';
import { useEffect, useState } from 'react';
import { Transaction  } from '../../types';

export default function Tx() {
  const { chainId, filter } = useParams<{ chainId?: string; filter?: string }>();
  
  const txHash = filter;
  
  const dataService = useDataService(1);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataService
    .getTransaction(filter ?? '')
    .then(fetchedTransaction => {
      console.log('Fetched transaction:', fetchedTransaction);
      setTransaction(fetchedTransaction);
    })
    .catch((err) => {
      console.error('Error fetching transaction:', err);
    })
    .finally(() => setLoading(false));

    if (!dataService || txHash === undefined) {
      setLoading(false);
      return;
    }
    console.log('Fetching transaction:', txHash);

    setLoading(true);
    
  }, [dataService, txHash]);

  return (
    <div>
      <h1>Tx</h1>
      <p>chainId: {chainId ?? 'none'}</p>
      <p>filter: {filter ?? 'none'}</p>
      <pre>{transaction ? JSON.stringify(transaction, null, 2) : 'Loading...'}</pre>
    </div>
  );
}
