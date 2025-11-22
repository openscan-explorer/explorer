// src/hooks/useDataService.ts
import { useMemo } from 'react';
import { useChainId } from 'wagmi';
import { DataService } from '../services/DataService';

/**
 * Hook to get a DataService for a specific chain
 * @param chainId - Optional chain ID. If not provided, uses the currently connected chain
 * @returns DataService instance
 */
export function useDataService(chainId?: number) {
  const connectedChainId = useChainId();
  const targetChainId = chainId ?? connectedChainId;
  
  const dataService = useMemo(() => {
    return new DataService(targetChainId);
  }, [targetChainId]);

  return dataService;
}