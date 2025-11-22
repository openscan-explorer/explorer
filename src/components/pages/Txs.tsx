import { useParams } from 'react-router-dom';

export default function Txs() {
  const { chainId } = useParams<{ chainId?: string }>();

  return (
    <div>
      <h1>Txs</h1>
      <p>chainId: {chainId ?? 'none'}</p>
    </div>
  );
}
