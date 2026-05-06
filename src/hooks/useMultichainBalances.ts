import { useContext, useEffect, useMemo, useReducer } from "react";
import { AppContext } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { getEnabledNetworks } from "../config/networks";
import { DataService } from "../services/DataService";
import { getNativeTokenPrice } from "../services/PriceService";
import type { NetworkConfig, RpcUrlsContextType } from "../types";
import { logger } from "../utils/logger";
import { getChainIdFromNetwork } from "../utils/networkResolver";

export interface MultichainBalanceRow {
  chainId: number;
  network: NetworkConfig;
  balance: string | null;
  usdValue: number | null;
  loading: boolean;
  error?: string;
}

type RowState = Map<number, MultichainBalanceRow>;

type Action =
  | { type: "init"; rows: MultichainBalanceRow[] }
  | { type: "balance"; chainId: number; balance: string }
  | { type: "balanceError"; chainId: number; error: string }
  | { type: "price"; chainId: number; usdValue: number | null };

function reducer(state: RowState, action: Action): RowState {
  switch (action.type) {
    case "init": {
      const next = new Map<number, MultichainBalanceRow>();
      for (const row of action.rows) next.set(row.chainId, row);
      return next;
    }
    case "balance": {
      const existing = state.get(action.chainId);
      if (!existing) return state;
      const next = new Map(state);
      next.set(action.chainId, {
        ...existing,
        balance: action.balance,
        loading: false,
        error: undefined,
      });
      return next;
    }
    case "balanceError": {
      const existing = state.get(action.chainId);
      if (!existing) return state;
      const next = new Map(state);
      next.set(action.chainId, {
        ...existing,
        balance: null,
        loading: false,
        error: action.error,
      });
      return next;
    }
    case "price": {
      const existing = state.get(action.chainId);
      if (!existing) return state;
      const next = new Map(state);
      next.set(action.chainId, { ...existing, usdValue: action.usdValue });
      return next;
    }
  }
}

// Mirrors the RPC-URL pickup pattern in AccountInfoCards.tsx so the two stay
// in sync if the rpcUrls shape ever changes.
function pickRpcUrl(rpcUrls: RpcUrlsContextType, chainId: number): string | undefined {
  const entry = rpcUrls[`eip155:${chainId}`];
  if (!entry) return undefined;
  return Array.isArray(entry) ? entry[0] : entry;
}

export function useMultichainBalances(
  address: string,
  currentChainId: number,
): { rows: MultichainBalanceRow[]; loading: boolean } {
  const { rpcUrls, networksLoading } = useContext(AppContext);
  const { settings } = useSettings();

  // The network list is build-time stable (sourced from import.meta.env), so
  // memoizing on currentChainId alone is sufficient. If OPENSCAN_NETWORKS ever
  // becomes a runtime user setting, add the relevant dep here.
  const targetNetworks = useMemo(() => {
    return getEnabledNetworks().filter((n) => {
      if (n.type !== "evm" || n.isTestnet) return false;
      const chainId = getChainIdFromNetwork(n);
      return chainId !== undefined && chainId !== currentChainId;
    });
  }, [currentChainId]);

  const [state, dispatch] = useReducer(reducer, new Map<number, MultichainBalanceRow>());

  // Initialize rows whenever the target list / address changes.
  useEffect(() => {
    const initial: MultichainBalanceRow[] = targetNetworks
      .map((network) => {
        const chainId = getChainIdFromNetwork(network);
        if (chainId === undefined) return null;
        const row: MultichainBalanceRow = {
          chainId,
          network,
          balance: null,
          usdValue: null,
          loading: true,
        };
        return row;
      })
      .filter((r): r is MultichainBalanceRow => r !== null);
    dispatch({ type: "init", rows: initial });
  }, [targetNetworks]);

  // Fetch balances per network. Stream each result independently. Re-runs when
  // rpcUrls flips (e.g. after metadata refresh in AppContext) — intentional, do
  // not remove rpcUrls from the deps or worker-proxy refresh will silently
  // serve stale endpoints.
  useEffect(() => {
    if (networksLoading) return;
    if (!address) return;
    if (targetNetworks.length === 0) return;

    let cancelled = false;
    const lowered = address.toLowerCase();

    for (const network of targetNetworks) {
      const chainId = getChainIdFromNetwork(network);
      if (chainId === undefined) continue;

      (async () => {
        try {
          const service = new DataService(network, rpcUrls, settings.rpcStrategy);
          const result = await service.networkAdapter.getAddress(lowered);
          if (cancelled) return;
          const balance = result?.data?.balance ?? "0";
          dispatch({ type: "balance", chainId, balance });
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : String(err);
          logger.warn(`Failed to fetch balance for chain ${chainId}:`, err);
          dispatch({ type: "balanceError", chainId, error: message });
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [targetNetworks, rpcUrls, settings.rpcStrategy, address, networksLoading]);

  // Fetch USD prices. Mirrors the pattern in AccountInfoCards.tsx — L2 ETH prices
  // are derived from a mainnet RPC, so pass it through.
  useEffect(() => {
    if (networksLoading) return;
    if (targetNetworks.length === 0) return;

    let cancelled = false;
    const mainnetRpcUrl = pickRpcUrl(rpcUrls, 1);

    for (const network of targetNetworks) {
      const chainId = getChainIdFromNetwork(network);
      if (chainId === undefined) continue;
      const rpcUrl = pickRpcUrl(rpcUrls, chainId);
      if (!rpcUrl) continue;

      (async () => {
        try {
          const price = await getNativeTokenPrice(chainId, rpcUrl, mainnetRpcUrl);
          if (cancelled) return;
          dispatch({ type: "price", chainId, usdValue: price });
        } catch (err) {
          if (cancelled) return;
          logger.warn(`Failed to fetch native token price for chain ${chainId}:`, err);
          dispatch({ type: "price", chainId, usdValue: null });
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [targetNetworks, rpcUrls, networksLoading]);

  const rows = useMemo(() => Array.from(state.values()), [state]);
  const loading = useMemo(() => rows.some((r) => r.loading), [rows]);

  return { rows, loading };
}
