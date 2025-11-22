// src/services/rpc/RPCClient.ts
export interface RPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any[];
}

export interface RPCResponse<T = any> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class RPCClient {
  private requestId = 0;

  constructor(private rpcUrl: string) {}

  async call<T = any>(method: string, params: any[] = []): Promise<T> {
    const request: RPCRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params,
    };

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
    }

    const data: RPCResponse<T> = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message} (code: ${data.error.code})`);
    }

    if (data.result === undefined) {
      throw new Error('RPC response missing result');
    }

    return data.result;
  }

  /**
   * Batch multiple RPC calls
   */
  async batchCall<T = any>(calls: Array<{ method: string; params: any[] }>): Promise<T[]> {
    const requests: RPCRequest[] = calls.map(call => ({
      jsonrpc: '2.0',
      id: ++this.requestId,
      method: call.method,
      params: call.params,
    }));

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requests),
    });

    if (!response.ok) {
      throw new Error(`RPC batch request failed: ${response.status} ${response.statusText}`);
    }

    const data: RPCResponse<T>[] = await response.json();

    return data.map(item => {
      if (item.error) {
        throw new Error(`RPC error: ${item.error.message} (code: ${item.error.code})`);
      }
      return item.result!;
    });
  }
}