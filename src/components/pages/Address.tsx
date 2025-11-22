import { useParams } from 'react-router-dom';

export default function Address() {
  const { chainId, address } = useParams<{ chainId?: string; address?: string }>();

  return (
    <div>
      <h1>Address</h1>
      <p>chainId: {chainId ?? 'none'}</p>
      <p>address: {address ?? 'none'}</p>
    </div>
  );
}
