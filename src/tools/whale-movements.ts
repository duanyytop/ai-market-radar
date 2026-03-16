import type { PublicClient } from 'viem';
import { formatUnits, parseAbiItem } from 'viem';
import type { DefiRadarConfig, ChainName, WhaleMovement } from '../types.js';
import { getClient, KNOWN_TOKENS } from '../chains/index.js';
import { getExchangeLookup } from '../exchanges/constants.js';
import { getTokenPrices } from '../pricing/coingecko.js';

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

const ERC20_METADATA_ABI = [
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

const MAX_BLOCKS = 2000;
const DEFAULT_BLOCKS = 500;

export async function getWhaleMovementsTool(
  config: DefiRadarConfig,
  chain?: string,
  token?: string,
  thresholdUsd?: number,
  blocks?: number,
): Promise<string> {
  const chains: ChainName[] =
    chain && chain !== 'all'
      ? [chain as ChainName]
      : config.monitoring?.chains ?? ['ethereum'];
  const threshold = thresholdUsd ?? config.monitoring?.whaleThresholdUsd ?? 100_000;
  const blockCount = Math.min(blocks ?? DEFAULT_BLOCKS, MAX_BLOCKS);

  const allMovements: WhaleMovement[] = [];

  // Get prices first
  const monitoredTokens = config.monitoring?.tokens ?? ['USDC', 'USDT', 'WETH', 'WBTC', 'DAI'];
  const tokensToCheck = token ? [token.toUpperCase()] : monitoredTokens;
  let prices: Record<string, number> = {};
  try {
    prices = await getTokenPrices(tokensToCheck, config.coingecko?.apiKey);
  } catch {
    // continue without prices
  }

  for (const chainName of chains) {
    const client = getClient(chainName, config);
    const exchangeLookup = getExchangeLookup(chainName);
    const knownTokens = KNOWN_TOKENS[chainName] ?? {};

    const tokenEntries = token
      ? Object.entries(knownTokens).filter(([sym]) => sym.toUpperCase() === token.toUpperCase())
      : Object.entries(knownTokens).filter(([sym]) => tokensToCheck.includes(sym.toUpperCase()));

    for (const [symbol, tokenAddress] of tokenEntries) {
      const price = prices[symbol.toUpperCase()] ?? 0;
      if (price === 0) continue;

      try {
        const movements = await scanWhaleTransfers(
          client,
          chainName,
          tokenAddress as `0x${string}`,
          symbol,
          price,
          threshold,
          blockCount,
          exchangeLookup,
        );
        allMovements.push(...movements);
      } catch {
        // skip
      }
    }
  }

  // Sort by USD amount descending
  allMovements.sort((a, b) => b.amountUsd - a.amountUsd);

  return formatWhaleMovements(allMovements, threshold);
}

async function scanWhaleTransfers(
  client: PublicClient,
  chain: ChainName,
  tokenAddress: `0x${string}`,
  symbol: string,
  price: number,
  thresholdUsd: number,
  blockCount: number,
  exchangeLookup: Map<string, { exchange: string; type: 'cex' | 'dex' }>,
): Promise<WhaleMovement[]> {
  const latestBlock = await client.getBlockNumber();
  const fromBlock = latestBlock - BigInt(blockCount);

  let decimals: number;
  try {
    decimals = await client.readContract({
      address: tokenAddress,
      abi: ERC20_METADATA_ABI,
      functionName: 'decimals',
    });
  } catch {
    return [];
  }

  // Calculate minimum token amount for the threshold
  const minTokenAmount = thresholdUsd / price;

  let logs;
  try {
    logs = await client.getLogs({
      event: TRANSFER_EVENT,
      address: tokenAddress,
      fromBlock,
      toBlock: latestBlock,
    });
  } catch {
    return [];
  }

  const movements: WhaleMovement[] = [];

  for (const log of logs) {
    const from = log.args.from;
    const to = log.args.to;
    const value = log.args.value;
    if (!from || !to || value === undefined) continue;

    const amount = parseFloat(formatUnits(value, decimals));
    if (amount < minTokenAmount) continue;

    const amountUsd = amount * price;
    const fromExchange = exchangeLookup.get(from.toLowerCase());
    const toExchange = exchangeLookup.get(to.toLowerCase());

    let direction: WhaleMovement['direction'];
    if (toExchange && toExchange.type === 'cex') {
      direction = 'to_exchange';
    } else if (fromExchange && fromExchange.type === 'cex') {
      direction = 'from_exchange';
    } else {
      direction = 'whale_transfer';
    }

    movements.push({
      chain,
      token: symbol,
      from: fromExchange ? `${fromExchange.exchange} (${shortenAddress(from)})` : shortenAddress(from),
      to: toExchange ? `${toExchange.exchange} (${shortenAddress(to)})` : shortenAddress(to),
      amount: amount.toFixed(4),
      amountUsd,
      txHash: log.transactionHash ?? '',
      direction,
    });
  }

  return movements;
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatWhaleMovements(movements: WhaleMovement[], threshold: number): string {
  const lines: string[] = [];
  lines.push(`Whale Movements (>$${threshold.toLocaleString('en-US')})`);
  lines.push('');

  if (movements.length === 0) {
    lines.push('No whale movements detected in the scanned block range.');
    return lines.join('\n');
  }

  const directionLabels = {
    to_exchange: '[SELL SIGNAL]',
    from_exchange: '[ACCUMULATION]',
    whale_transfer: '[TRANSFER]',
  };

  // Show top 20
  const top = movements.slice(0, 20);
  for (const m of top) {
    lines.push(
      `  ${m.chain.toUpperCase()} | ${m.token} | $${m.amountUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${directionLabels[m.direction]}`,
    );
    lines.push(`    ${m.amount} ${m.token}: ${m.from} → ${m.to}`);
    if (m.txHash) {
      lines.push(`    tx: ${m.txHash}`);
    }
    lines.push('');
  }

  if (movements.length > 20) {
    lines.push(`  ... and ${movements.length - 20} more movements`);
    lines.push('');
  }

  // Summary
  const toExchange = movements.filter((m) => m.direction === 'to_exchange');
  const fromExchange = movements.filter((m) => m.direction === 'from_exchange');
  const toExchangeUsd = toExchange.reduce((s, m) => s + m.amountUsd, 0);
  const fromExchangeUsd = fromExchange.reduce((s, m) => s + m.amountUsd, 0);

  lines.push('Summary:');
  lines.push(`  To exchanges:   ${toExchange.length} transfers, $${toExchangeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
  lines.push(`  From exchanges: ${fromExchange.length} transfers, $${fromExchangeUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
  lines.push(`  Whale-to-whale: ${movements.length - toExchange.length - fromExchange.length} transfers`);

  return lines.join('\n');
}
