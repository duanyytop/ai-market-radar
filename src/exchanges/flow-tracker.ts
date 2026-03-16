import type { PublicClient } from 'viem';
import { formatUnits, parseAbiItem } from 'viem';
import type { ChainName, ExchangeFlow, ExchangeFlowResult } from '../types.js';
import { KNOWN_TOKENS } from '../chains/index.js';
import { getExchangeLookup } from './constants.js';

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

const MAX_BLOCKS = 5000;
const DEFAULT_BLOCKS = 100;
// Alchemy free tier allows max 10 blocks per getLogs request
const CHUNK_SIZE = 10;

// Minimal ABI for decimals and symbol
const ERC20_METADATA_ABI = [
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

interface TokenMeta {
  symbol: string;
  decimals: number;
}

const tokenMetaCache = new Map<string, TokenMeta>();

async function getTokenMeta(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  knownSymbol?: string,
): Promise<TokenMeta> {
  const key = tokenAddress.toLowerCase();
  const cached = tokenMetaCache.get(key);
  if (cached) return cached;

  const [decimals, symbol] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: ERC20_METADATA_ABI,
      functionName: 'decimals',
    }),
    knownSymbol
      ? Promise.resolve(knownSymbol)
      : client.readContract({
          address: tokenAddress,
          abi: ERC20_METADATA_ABI,
          functionName: 'symbol',
        }),
  ]);

  const meta = { symbol, decimals };
  tokenMetaCache.set(key, meta);
  return meta;
}

/**
 * Fetch logs in chunks to work within RPC provider block range limits.
 * Alchemy free tier limits eth_getLogs to 10 blocks per request.
 */
async function getLogsChunked(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
) {
  const allLogs: Awaited<ReturnType<typeof client.getLogs<typeof TRANSFER_EVENT>>> = [];

  for (let start = fromBlock; start <= toBlock; start += BigInt(CHUNK_SIZE)) {
    const end = start + BigInt(CHUNK_SIZE) - 1n > toBlock ? toBlock : start + BigInt(CHUNK_SIZE) - 1n;
    const logs = await client.getLogs({
      event: TRANSFER_EVENT,
      address: tokenAddress,
      fromBlock: start,
      toBlock: end,
    });
    allLogs.push(...logs);
  }

  return allLogs;
}

export interface ExchangeFlowOptions {
  token?: `0x${string}`;
  exchange?: string;
  blocks?: number;
}

export async function getExchangeFlows(
  client: PublicClient,
  chain: ChainName,
  options: ExchangeFlowOptions = {},
): Promise<ExchangeFlowResult> {
  const blocks = Math.min(options.blocks ?? DEFAULT_BLOCKS, MAX_BLOCKS);
  const latestBlock = await client.getBlockNumber();
  const fromBlock = latestBlock - BigInt(blocks);

  const exchangeLookup = getExchangeLookup(chain);

  // Determine which token addresses to scan
  let tokenAddresses: `0x${string}`[];
  if (options.token) {
    tokenAddresses = [options.token];
  } else {
    tokenAddresses = Object.values(KNOWN_TOKENS[chain] ?? {}) as `0x${string}`[];
  }

  // Build known symbol map for quick lookup
  const knownSymbolMap = new Map<string, string>();
  for (const [sym, addr] of Object.entries(KNOWN_TOKENS[chain] ?? {})) {
    knownSymbolMap.set(addr.toLowerCase(), sym);
  }

  // Accumulator: key = "exchange|token" -> { inflow, outflow }
  const flowMap = new Map<
    string,
    {
      exchange: string;
      type: 'cex' | 'dex';
      token: string;
      tokenAddress: `0x${string}`;
      inflow: bigint;
      outflow: bigint;
      decimals: number;
    }
  >();

  for (const tokenAddress of tokenAddresses) {
    const sym = knownSymbolMap.get(tokenAddress.toLowerCase()) ?? tokenAddress;
    let logs;
    try {
      logs = await getLogsChunked(client, tokenAddress, fromBlock, latestBlock);
      console.error(`[${chain}] ${sym}: ${logs.length} transfer logs in ${blocks} blocks`);
    } catch (err) {
      console.error(`[${chain}] getLogs failed for ${sym}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    let tokenMeta: TokenMeta | null = null;

    for (const log of logs) {
      const from = log.args.from?.toLowerCase();
      const to = log.args.to?.toLowerCase();
      const value = log.args.value;
      if (!from || !to || value === undefined) continue;

      const fromExchange = from ? exchangeLookup.get(from) : undefined;
      const toExchange = to ? exchangeLookup.get(to) : undefined;

      if (!fromExchange && !toExchange) continue;

      // Apply exchange name filter
      if (options.exchange) {
        const filterLower = options.exchange.toLowerCase();
        const fromMatch = fromExchange?.exchange.toLowerCase() === filterLower;
        const toMatch = toExchange?.exchange.toLowerCase() === filterLower;
        if (!fromMatch && !toMatch) continue;
      }

      // Lazy-load token metadata
      if (!tokenMeta) {
        try {
          tokenMeta = await getTokenMeta(
            client,
            tokenAddress,
            knownSymbolMap.get(tokenAddress.toLowerCase()),
          );
        } catch (err) {
          console.error(`[${chain}] getTokenMeta failed for ${tokenAddress}: ${err instanceof Error ? err.message : String(err)}`);
          break;
        }
      }

      // Inflow: transfer TO an exchange
      if (toExchange) {
        const key = `${toExchange.exchange}|${tokenMeta.symbol}`;
        const entry = flowMap.get(key) ?? {
          exchange: toExchange.exchange,
          type: toExchange.type,
          token: tokenMeta.symbol,
          tokenAddress,
          inflow: 0n,
          outflow: 0n,
          decimals: tokenMeta.decimals,
        };
        entry.inflow += value;
        flowMap.set(key, entry);
      }

      // Outflow: transfer FROM an exchange
      if (fromExchange) {
        const key = `${fromExchange.exchange}|${tokenMeta.symbol}`;
        const entry = flowMap.get(key) ?? {
          exchange: fromExchange.exchange,
          type: fromExchange.type,
          token: tokenMeta.symbol,
          tokenAddress,
          inflow: 0n,
          outflow: 0n,
          decimals: tokenMeta.decimals,
        };
        entry.outflow += value;
        flowMap.set(key, entry);
      }
    }
  }

  // Convert to ExchangeFlow[]
  const flows: ExchangeFlow[] = [];
  for (const entry of flowMap.values()) {
    const inflow = formatUnits(entry.inflow, entry.decimals);
    const outflow = formatUnits(entry.outflow, entry.decimals);
    const net = entry.inflow - entry.outflow;

    flows.push({
      exchange: entry.exchange,
      type: entry.type,
      token: entry.token,
      inflow,
      outflow,
      netFlow:
        net < 0n ? `-${formatUnits(-net, entry.decimals)}` : formatUnits(net, entry.decimals),
    });
  }

  // Sort: CEX first, then by exchange name
  flows.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'cex' ? -1 : 1;
    return a.exchange.localeCompare(b.exchange) || a.token.localeCompare(b.token);
  });

  return {
    chain,
    blockRange: { from: fromBlock, to: latestBlock },
    flows,
    summary: {
      totalInflowUsd: 0,
      totalOutflowUsd: 0,
      netFlowUsd: 0,
    },
  };
}
