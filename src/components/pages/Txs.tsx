import { useParams } from 'react-router-dom';
import { useDataService } from '../../hooks/useDataService';
import { useEffect, useState } from 'react';
import { Transaction } from '../../types';

export default function Txs() {
  const { chainId } = useParams<{ chainId?: string }>();
  const dataService = useDataService(Number(chainId) || 1);
  const [transactions, setTransactions] = useState<Array<Transaction & { blockNumber: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataService) {
      setLoading(false);
      return;
    }

    console.log('Fetching transactions from latest 10 blocks for chain:', chainId);
    setLoading(true);
    setError(null);

    dataService
      .getTransactionsFromLatestBlocks(10)
      .then(fetchedTransactions => {
        console.log('Fetched transactions:', fetchedTransactions);
        setTransactions(fetchedTransactions);
      })
      .catch((err) => {
        console.error('Error fetching transactions:', err);
        setError(err.message || 'Failed to fetch transactions');
      })
      .finally(() => setLoading(false));
  }, [dataService, chainId]);

  if (loading) {
    return (
      <div>
        <h1>Latest Transactions</h1>
        <p>chainId: {chainId ?? 'none'}</p>
        <p>Loading transactions from the last 10 blocks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Latest Transactions</h1>
        <p>chainId: {chainId ?? 'none'}</p>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Latest Transactions</h1>
      <p>chainId: {chainId ?? 'none'}</p>
      <p>Showing {transactions.length} transactions from the last 10 blocks</p>
      
      {transactions.length === 0 ? (
        <p>No transactions found in the last 10 blocks</p>
      ) : (
        transactions.map((transaction, index) => (
          <div key={transaction.hash} style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
            <h2>Transaction #{index + 1}</h2>
            <p><strong>Hash:</strong> {transaction.hash}</p>
            <p><strong>Block:</strong> {transaction.blockNumber}</p>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '1rem', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.875rem'
            }}>
              {JSON.stringify(transaction, null, 2)}
            </pre>
          </div>
        ))
      )}
    </div>
  );
}
