import { useParams } from 'react-router-dom';

export default function Chain() {
  const { chainId } = useParams<{ chainId?: string }>();

  return (
    <div>
      <h1>Chain</h1>
      <p>chainId: {chainId ?? 'none'}</p>
    </div>
  );
}
