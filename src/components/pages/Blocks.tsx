import { useParams } from 'react-router-dom';

export default function Blocks() {
  const { chainId } = useParams<{ chainId?: string }>();

  return (
    <div>
      <h1>Blocks</h1>
      <p>chainId: {chainId ?? 'none'}</p>
    </div>
  );
}
