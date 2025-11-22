import { useParams } from 'react-router-dom';

export default function Block() {
  const { chainId, filter } = useParams<{ chainId?: string; filter?: string }>();

  return (
    <div>
      <h1>Block</h1>
      <p>chainId: {chainId ?? 'none'}</p>
      <p>filter: {filter ?? 'none'}</p>
    </div>
  );
}
