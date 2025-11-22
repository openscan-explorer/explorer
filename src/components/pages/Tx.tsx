import { useParams } from 'react-router-dom';
import { useDataService } from '../../hooks/useDataService';
import { useEffect, useState } from 'react';
import { Transaction } from '../../types';
import TransactionDisplay from '../common/TransactionDisplay';

export default function Tx() {
  const { chainId, filter } = useParams<{ chainId?: string; filter?: string }>();
  
  const txHash = filter;
  
  const dataService = useDataService(Number(chainId) || 1);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService || !txHash) {
      setLoading(false);
      return;
    }
    
    console.log('Fetching transaction:', txHash);
    setLoading(true);
    setError(null);
    
    dataService
      .getTransaction(txHash)
      .then(fetchedTransaction => {
        console.log('Fetched transaction:', fetchedTransaction);
        setTransaction(fetchedTransaction);
      })
      .catch((err) => {
        console.error('Error fetching transaction:', err);
        setError(err.message || 'Failed to fetch transaction');
      })
      .finally(() => setLoading(false));
  }, [dataService, txHash]);

  if (loading) {
    return (
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', color: '#059669', marginBottom: '1rem' }}>Transaction</h1>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', color: '#059669', marginBottom: '1rem' }}>Transaction</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>     
      {transaction ? (
        <>
          <TransactionDisplay transaction={transaction} />
        </>
      ) : (
        <p>Transaction not found</p>
      )}
    </div>
  );
}
