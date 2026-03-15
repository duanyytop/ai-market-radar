import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getExchangeFlows } from '../exchanges/flow-tracker.js';
import type { PublicClient } from 'viem';

// Mock transfer log entry
function makeTransferLog(
  from: `0x${string}`,
  to: `0x${string}`,
  value: bigint,
  tokenAddress: `0x${string}` = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
) {
  return {
    address: tokenAddress,
    args: { from, to, value },
    blockNumber: 1000n,
    blockHash: '0x' as `0x${string}`,
    transactionHash: '0x' as `0x${string}`,
    transactionIndex: 0,
    logIndex: 0,
    removed: false,
    data: '0x' as `0x${string}`,
    topics: [] as [] | [`0x${string}`, ...`0x${string}`[]],
    eventName: 'Transfer' as const,
  };
}

function createMockClient(logs: ReturnType<typeof makeTransferLog>[] = []): PublicClient {
  return {
    getBlockNumber: vi.fn().mockResolvedValue(20000n),
    getLogs: vi.fn().mockResolvedValue(logs),
    readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'decimals') return Promise.resolve(6);
      if (functionName === 'symbol') return Promise.resolve('USDC');
      return Promise.resolve(0n);
    }),
  } as unknown as PublicClient;
}

// Binance hot wallet address (from constants)
const BINANCE_ADDR = '0x28C6c06298d514Db089934071355E5743bf21d60' as `0x${string}`;
const USER_ADDR = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`;
const USDC_ADDR = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`;

describe('Flow Tracker', () => {
  it('returns empty flows when no exchange transfers found', async () => {
    const client = createMockClient([]);
    const result = await getExchangeFlows(client, 'ethereum', { token: USDC_ADDR });
    expect(result.flows).toHaveLength(0);
    expect(result.chain).toBe('ethereum');
  });

  it('detects inflow to exchange', async () => {
    const logs = [makeTransferLog(USER_ADDR, BINANCE_ADDR, 1000000n, USDC_ADDR)]; // 1 USDC
    const client = createMockClient(logs);

    const result = await getExchangeFlows(client, 'ethereum', { token: USDC_ADDR });
    expect(result.flows.length).toBeGreaterThan(0);

    const binanceFlow = result.flows.find((f) => f.exchange === 'Binance');
    expect(binanceFlow).toBeDefined();
    expect(parseFloat(binanceFlow!.inflow)).toBe(1);
    expect(parseFloat(binanceFlow!.outflow)).toBe(0);
  });

  it('detects outflow from exchange', async () => {
    const logs = [makeTransferLog(BINANCE_ADDR, USER_ADDR, 5000000n, USDC_ADDR)]; // 5 USDC
    const client = createMockClient(logs);

    const result = await getExchangeFlows(client, 'ethereum', { token: USDC_ADDR });
    const binanceFlow = result.flows.find((f) => f.exchange === 'Binance');
    expect(binanceFlow).toBeDefined();
    expect(parseFloat(binanceFlow!.outflow)).toBe(5);
    expect(parseFloat(binanceFlow!.inflow)).toBe(0);
  });

  it('calculates net flow correctly', async () => {
    const logs = [
      makeTransferLog(USER_ADDR, BINANCE_ADDR, 10000000n, USDC_ADDR), // 10 USDC in
      makeTransferLog(BINANCE_ADDR, USER_ADDR, 3000000n, USDC_ADDR), // 3 USDC out
    ];
    const client = createMockClient(logs);

    const result = await getExchangeFlows(client, 'ethereum', { token: USDC_ADDR });
    const binanceFlow = result.flows.find((f) => f.exchange === 'Binance');
    expect(binanceFlow).toBeDefined();
    expect(parseFloat(binanceFlow!.inflow)).toBe(10);
    expect(parseFloat(binanceFlow!.outflow)).toBe(3);
    expect(parseFloat(binanceFlow!.netFlow)).toBe(7); // net inflow
  });

  it('caps block range at 5000', async () => {
    const client = createMockClient([]);
    const result = await getExchangeFlows(client, 'ethereum', {
      token: USDC_ADDR,
      blocks: 10000,
    });
    // fromBlock should be latestBlock - 5000 = 20000 - 5000 = 15000
    expect(result.blockRange.from).toBe(15000n);
    expect(result.blockRange.to).toBe(20000n);
  });

  it('uses default 1000 blocks when not specified', async () => {
    const client = createMockClient([]);
    const result = await getExchangeFlows(client, 'ethereum', { token: USDC_ADDR });
    expect(result.blockRange.from).toBe(19000n);
    expect(result.blockRange.to).toBe(20000n);
  });

  it('filters by exchange name', async () => {
    const coinbaseAddr = '0x503828976D22510aad0201ac7EC88293211D23Da' as `0x${string}`;
    const logs = [
      makeTransferLog(USER_ADDR, BINANCE_ADDR, 1000000n, USDC_ADDR),
      makeTransferLog(USER_ADDR, coinbaseAddr, 2000000n, USDC_ADDR),
    ];
    const client = createMockClient(logs);

    const result = await getExchangeFlows(client, 'ethereum', {
      token: USDC_ADDR,
      exchange: 'Coinbase',
    });

    // Should only have Coinbase flows
    expect(result.flows.every((f) => f.exchange === 'Coinbase')).toBe(true);
  });
});
