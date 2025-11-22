import { useParams } from 'react-router-dom';

export default function Tx() {
  const { chainId, filter } = useParams<{ chainId?: string; filter?: string }>();

  return (
    <div>
      <h1>Tx</h1>
      <p>chainId: {chainId ?? 'none'}</p>
      <p>filter: {filter ?? 'none'}</p>
    </div>
  );
}
