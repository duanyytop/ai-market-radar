import type { DefiRadarConfig, ChainName, ExchangeFlowResult, StablecoinFlow, WhaleMovement, MarketSignal } from '../types.js';
import { getClient, KNOWN_TOKENS } from '../chains/index.js';
import { getExchangeFlows } from '../exchanges/index.js';
import { getTokenPrices } from '../pricing/coingecko.js';
import { getExchangeLookup } from '../exchanges/constants.js';
import { formatUnits, parseAbiItem, type PublicClient } from 'viem';
import { type Locale, t } from './i18n.js';

// Focused token sets for daily report — only high-signal tokens on Ethereum
const REPORT_CHAIN: ChainName = 'ethereum';
const REPORT_BLOCKS = 500;
const EXCHANGE_FLOW_TOKENS = ['USDC', 'USDT', 'WETH', 'WBTC'];
const STABLECOIN_TOKENS = ['USDC', 'USDT'];
const WHALE_TOKENS = ['WETH', 'WBTC', 'USDC'];
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);
const ERC20_DECIMALS_ABI = [
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;
const LOG_CHUNK_SIZE = 10n;
const CHUNK_DELAY_MS = 200;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getLogsChunked(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
) {
  const allLogs: Awaited<ReturnType<typeof client.getLogs<typeof TRANSFER_EVENT>>> = [];
  let isFirst = true;
  for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK_SIZE) {
    if (!isFirst) await sleep(CHUNK_DELAY_MS);
    isFirst = false;
    const end = start + LOG_CHUNK_SIZE - 1n > toBlock ? toBlock : start + LOG_CHUNK_SIZE - 1n;
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

export async function generateDailyReport(
  config: DefiRadarConfig,
  locale: Locale = 'en',
  _chain?: string,
): Promise<string> {
  const chains: ChainName[] = [REPORT_CHAIN];
  const whaleThreshold = config.monitoring?.whaleThresholdUsd ?? 100_000;

  // Collect data sequentially to avoid rate limits
  const exchangeFlows = await collectExchangeFlows(config);
  const stablecoinFlows = await collectStablecoinFlows(config);
  const whaleMovements = await collectWhaleMovements(config, whaleThreshold);

  const signals = deriveSignals(exchangeFlows, stablecoinFlows, whaleMovements);

  return formatReport(locale, chains, exchangeFlows, stablecoinFlows, whaleMovements, signals);
}

async function collectExchangeFlows(
  config: DefiRadarConfig,
): Promise<ExchangeFlowResult[]> {
  const knownTokens = KNOWN_TOKENS[REPORT_CHAIN] ?? {};
  const client = getClient(REPORT_CHAIN, config);
  const results: ExchangeFlowResult[] = [];

  // Scan only focused tokens one by one to control rate
  for (const symbol of EXCHANGE_FLOW_TOKENS) {
    const addr = knownTokens[symbol];
    if (!addr) continue;

    try {
      const result = await getExchangeFlows(client, REPORT_CHAIN, {
        token: addr as `0x${string}`,
        blocks: REPORT_BLOCKS,
      });
      console.error(`[${REPORT_CHAIN}] exchange flow ${symbol}: ${result.flows.length} flows`);

      // Enrich with prices
      if (result.flows.length > 0) {
        try {
          const prices = await getTokenPrices([symbol], config.coingecko?.apiKey);
          const price = prices[symbol.toUpperCase()] ?? 0;
          let totalIn = 0;
          let totalOut = 0;
          for (const f of result.flows) {
            f.inflowUsd = parseFloat(f.inflow) * price;
            f.outflowUsd = parseFloat(f.outflow) * price;
            totalIn += f.inflowUsd;
            totalOut += f.outflowUsd;
          }
          result.summary = { totalInflowUsd: totalIn, totalOutflowUsd: totalOut, netFlowUsd: totalIn - totalOut };
        } catch (err) {
          console.error(`[${REPORT_CHAIN}] price fetch failed for ${symbol}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      results.push(result);
    } catch (err) {
      console.error(`[${REPORT_CHAIN}] exchange flow ${symbol} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Merge all per-token results into one ExchangeFlowResult
  if (results.length > 0) {
    const merged: ExchangeFlowResult = {
      chain: REPORT_CHAIN,
      blockRange: results[0].blockRange,
      flows: results.flatMap((r) => r.flows),
      summary: {
        totalInflowUsd: results.reduce((s, r) => s + r.summary.totalInflowUsd, 0),
        totalOutflowUsd: results.reduce((s, r) => s + r.summary.totalOutflowUsd, 0),
        netFlowUsd: results.reduce((s, r) => s + r.summary.netFlowUsd, 0),
      },
    };
    return [merged];
  }
  return [];
}

async function collectStablecoinFlows(
  config: DefiRadarConfig,
): Promise<StablecoinFlow[]> {
  const knownTokens = KNOWN_TOKENS[REPORT_CHAIN] ?? {};
  const client = getClient(REPORT_CHAIN, config);
  const results: StablecoinFlow[] = [];

  for (const symbol of STABLECOIN_TOKENS) {
    const addr = knownTokens[symbol];
    if (!addr) continue;

    try {
      const flowResult = await getExchangeFlows(client, REPORT_CHAIN, {
        token: addr as `0x${string}`,
        blocks: REPORT_BLOCKS,
      });

      let totalInflow = 0;
      let totalOutflow = 0;
      for (const f of flowResult.flows) {
        totalInflow += parseFloat(f.inflow);
        totalOutflow += parseFloat(f.outflow);
      }
      const netFlow = totalInflow - totalOutflow;
      console.error(`[${REPORT_CHAIN}] stablecoin ${symbol}: net flow $${netFlow.toFixed(0)}`);
      const signal: StablecoinFlow['signal'] =
        netFlow > 10_000 ? 'bullish' : netFlow < -10_000 ? 'bearish' : 'neutral';

      results.push({
        token: symbol,
        chain: REPORT_CHAIN,
        netMintBurn: '0',
        exchangeNetFlow: netFlow.toFixed(2),
        netMintBurnUsd: 0,
        exchangeNetFlowUsd: netFlow,
        signal,
      });
    } catch (err) {
      console.error(`[${REPORT_CHAIN}] stablecoin ${symbol} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return results;
}

async function collectWhaleMovements(
  config: DefiRadarConfig,
  thresholdUsd: number,
): Promise<WhaleMovement[]> {
  let prices: Record<string, number> = {};
  try {
    prices = await getTokenPrices(WHALE_TOKENS, config.coingecko?.apiKey);
    console.error(`[whale] prices: ${JSON.stringify(prices)}`);
  } catch (err) {
    console.error(`[whale] price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }

  const client = getClient(REPORT_CHAIN, config);
  const exchangeLookup = getExchangeLookup(REPORT_CHAIN);
  const knownTokens = KNOWN_TOKENS[REPORT_CHAIN] ?? {};
  const movements: WhaleMovement[] = [];

  for (const symbol of WHALE_TOKENS) {
    const tokenAddress = knownTokens[symbol];
    if (!tokenAddress) continue;

    const price = prices[symbol.toUpperCase()] ?? 0;
    if (price === 0) continue;

    try {
      const latestBlock = await client.getBlockNumber();
      const fromBlock = latestBlock - BigInt(REPORT_BLOCKS);

      let decimals: number;
      try {
        decimals = await client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_DECIMALS_ABI,
          functionName: 'decimals',
        });
      } catch (err) {
        console.error(`[${REPORT_CHAIN}] whale decimals failed for ${symbol}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      const minTokenAmount = thresholdUsd / price;
      const logs = await getLogsChunked(client, tokenAddress as `0x${string}`, fromBlock, latestBlock);
      console.error(`[${REPORT_CHAIN}] whale ${symbol}: ${logs.length} logs in ${REPORT_BLOCKS} blocks`);

      for (const log of logs) {
        const from = log.args.from;
        const to = log.args.to;
        const value = log.args.value;
        if (!from || !to || value === undefined) continue;

        const amount = parseFloat(formatUnits(value, decimals));
        if (amount < minTokenAmount) continue;

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

        const shortenAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

        movements.push({
          chain: REPORT_CHAIN,
          token: symbol,
          from: fromExchange ? `${fromExchange.exchange} (${shortenAddr(from)})` : shortenAddr(from),
          to: toExchange ? `${toExchange.exchange} (${shortenAddr(to)})` : shortenAddr(to),
          amount: amount.toFixed(4),
          amountUsd: amount * price,
          txHash: log.transactionHash ?? '',
          direction,
        });
      }
    } catch (err) {
      console.error(`[${REPORT_CHAIN}] whale ${symbol} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  movements.sort((a, b) => b.amountUsd - a.amountUsd);
  return movements;
}

function deriveSignals(
  exchangeFlows: ExchangeFlowResult[],
  stablecoinFlows: StablecoinFlow[],
  whaleMovements: WhaleMovement[],
): MarketSignal[] {
  const signals: MarketSignal[] = [];

  // Exchange flow signals
  for (const result of exchangeFlows) {
    const cexFlows = result.flows.filter((f) => f.type === 'cex');
    const totalCexIn = cexFlows.reduce((s, f) => s + (f.inflowUsd ?? 0), 0);
    const totalCexOut = cexFlows.reduce((s, f) => s + (f.outflowUsd ?? 0), 0);
    const netCex = totalCexIn - totalCexOut;

    if (Math.abs(netCex) > 1_000_000) {
      signals.push({
        type: 'exchange_flow',
        severity: Math.abs(netCex) > 10_000_000 ? 'significant' : 'notable',
        signal: netCex > 0 ? 'bearish' : 'bullish',
        message: netCex > 0
          ? `$${(netCex / 1e6).toFixed(1)}M net inflow to CEX on ${result.chain} — sell pressure`
          : `$${(Math.abs(netCex) / 1e6).toFixed(1)}M net outflow from CEX on ${result.chain} — accumulation`,
      });
    }
  }

  // Stablecoin signals
  const totalStableNet = stablecoinFlows.reduce((s, f) => s + f.exchangeNetFlowUsd, 0);
  if (Math.abs(totalStableNet) > 100_000) {
    signals.push({
      type: 'stablecoin',
      severity: Math.abs(totalStableNet) > 1_000_000 ? 'significant' : 'notable',
      signal: totalStableNet > 0 ? 'bullish' : 'bearish',
      message: totalStableNet > 0
        ? `$${(totalStableNet / 1e6).toFixed(1)}M stablecoins entered exchanges — buying power`
        : `$${(Math.abs(totalStableNet) / 1e6).toFixed(1)}M stablecoins left exchanges — reduced demand`,
    });
  }

  // Whale signals
  const toExchangeUsd = whaleMovements
    .filter((m) => m.direction === 'to_exchange')
    .reduce((s, m) => s + m.amountUsd, 0);
  const fromExchangeUsd = whaleMovements
    .filter((m) => m.direction === 'from_exchange')
    .reduce((s, m) => s + m.amountUsd, 0);

  if (toExchangeUsd > 500_000) {
    signals.push({
      type: 'whale',
      severity: toExchangeUsd > 5_000_000 ? 'significant' : 'notable',
      signal: 'bearish',
      message: `$${(toExchangeUsd / 1e6).toFixed(1)}M whale deposits to exchanges`,
    });
  }
  if (fromExchangeUsd > 500_000) {
    signals.push({
      type: 'whale',
      severity: fromExchangeUsd > 5_000_000 ? 'significant' : 'notable',
      signal: 'bullish',
      message: `$${(fromExchangeUsd / 1e6).toFixed(1)}M whale withdrawals from exchanges`,
    });
  }

  return signals;
}

function formatReport(
  locale: Locale,
  chains: ChainName[],
  exchangeFlows: ExchangeFlowResult[],
  stablecoinFlows: StablecoinFlow[],
  whaleMovements: WhaleMovement[],
  signals: MarketSignal[],
): string {
  const lines: string[] = [];
  const date = new Date().toISOString().split('T')[0];

  // Header
  lines.push(`# ${t('reportTitle', locale)} — ${date}`);
  lines.push('');
  lines.push(`**${t('chains', locale)}:** ${chains.join(', ')}`);
  lines.push(`**${t('generatedAt', locale)}:** ${new Date().toISOString()}`);
  lines.push('');

  // Exchange Flows
  lines.push(`## ${t('sectionExchangeFlows', locale)}`);
  lines.push('');
  if (exchangeFlows.length === 0) {
    lines.push(t('noExchangeData', locale));
  } else {
    for (const result of exchangeFlows) {
      lines.push(`### ${result.chain.toUpperCase()}`);
      const cexFlows = result.flows.filter((f) => f.type === 'cex');
      const dexFlows = result.flows.filter((f) => f.type === 'dex');

      if (cexFlows.length > 0) {
        lines.push(`**${t('cexFlows', locale)}:**`);
        for (const f of cexFlows) {
          const inUsd = f.inflowUsd ? ` ($${formatUsd(f.inflowUsd)})` : '';
          const outUsd = f.outflowUsd ? ` ($${formatUsd(f.outflowUsd)})` : '';
          lines.push(`- ${f.exchange} | ${f.token}: In ${f.inflow}${inUsd} / Out ${f.outflow}${outUsd}`);
        }
        lines.push('');
      }
      if (dexFlows.length > 0) {
        lines.push(`**${t('dexFlows', locale)}:**`);
        for (const f of dexFlows) {
          lines.push(`- ${f.exchange} | ${f.token}: In ${f.inflow} / Out ${f.outflow}`);
        }
        lines.push('');
      }

      if (result.summary.totalInflowUsd > 0 || result.summary.totalOutflowUsd > 0) {
        const isNet = result.summary.netFlowUsd >= 0;
        lines.push(`> ${t('totalInflow', locale)}: $${formatUsd(result.summary.totalInflowUsd)} | ${t('totalOutflow', locale)}: $${formatUsd(result.summary.totalOutflowUsd)} | ${isNet ? t('netInflow', locale) : t('netOutflow', locale)}: $${formatUsd(Math.abs(result.summary.netFlowUsd))}`);
        lines.push('');
      }
    }
  }

  // Stablecoin Flows
  lines.push(`## ${t('sectionStablecoin', locale)}`);
  lines.push('');
  if (stablecoinFlows.length === 0) {
    lines.push(t('noStablecoinData', locale));
  } else {
    for (const f of stablecoinFlows) {
      const direction = f.exchangeNetFlowUsd >= 0 ? t('netInflow', locale) : t('netOutflow', locale);
      const signalLabel = t(f.signal, locale);
      lines.push(`- **${f.chain.toUpperCase()}** ${f.token}: ${direction} $${formatUsd(Math.abs(f.exchangeNetFlowUsd))} [${signalLabel}]`);
    }
    lines.push('');
  }

  // Whale Movements
  lines.push(`## ${t('sectionWhale', locale)}`);
  lines.push('');
  if (whaleMovements.length === 0) {
    lines.push(t('noWhaleData', locale));
  } else {
    const top = whaleMovements.slice(0, 10);
    for (const m of top) {
      let label: string;
      if (m.direction === 'to_exchange') label = t('whaleToExchange', locale);
      else if (m.direction === 'from_exchange') label = t('whaleFromExchange', locale);
      else label = t('whaleTransfer', locale);

      lines.push(`- **${m.chain.toUpperCase()}** ${m.token} $${formatUsd(m.amountUsd)} — ${label}`);
      lines.push(`  ${m.from} → ${m.to}`);
    }
    if (whaleMovements.length > 10) {
      lines.push(`- ... ${locale === 'zh' ? `还有 ${whaleMovements.length - 10} 笔` : `and ${whaleMovements.length - 10} more`}`);
    }
    lines.push('');
  }

  // Market Signals
  lines.push(`## ${t('sectionMarketSignals', locale)}`);
  lines.push('');
  if (signals.length === 0) {
    lines.push(t('suggAllCalm', locale));
  } else {
    for (const s of signals) {
      const sevLabel = t(s.severity, locale);
      const sigLabel = t(s.signal, locale);
      lines.push(`- [${sevLabel}] [${sigLabel}] ${s.message}`);
    }
  }
  lines.push('');

  // Suggestions
  lines.push(`## ${t('sectionSuggestions', locale)}`);
  lines.push('');
  const suggestions = deriveSuggestions(locale, exchangeFlows, stablecoinFlows, whaleMovements);
  for (const s of suggestions) {
    lines.push(`- ${s}`);
  }
  lines.push('');

  // Disclaimer
  lines.push('---');
  lines.push(`*${t('disclaimer', locale)}*`);

  return lines.join('\n');
}

function deriveSuggestions(
  locale: Locale,
  exchangeFlows: ExchangeFlowResult[],
  stablecoinFlows: StablecoinFlow[],
  whaleMovements: WhaleMovement[],
): string[] {
  const suggestions: string[] = [];

  const totalCexNet = exchangeFlows.reduce((s, r) => {
    const cex = r.flows.filter((f) => f.type === 'cex');
    return s + cex.reduce((ss, f) => ss + (f.inflowUsd ?? 0) - (f.outflowUsd ?? 0), 0);
  }, 0);

  if (totalCexNet > 1_000_000) {
    suggestions.push(t('suggCexInflow', locale));
  } else if (totalCexNet < -1_000_000) {
    suggestions.push(t('suggCexOutflow', locale));
  }

  const totalStableNet = stablecoinFlows.reduce((s, f) => s + f.exchangeNetFlowUsd, 0);
  if (totalStableNet > 100_000) {
    suggestions.push(t('suggStableInflow', locale));
  } else if (totalStableNet < -100_000) {
    suggestions.push(t('suggStableOutflow', locale));
  }

  const whaleToExchange = whaleMovements.filter((m) => m.direction === 'to_exchange').length;
  const whaleFromExchange = whaleMovements.filter((m) => m.direction === 'from_exchange').length;
  if (whaleToExchange > 0 || whaleFromExchange > 0) {
    suggestions.push(t('suggWhaleAlert', locale));
  }

  if (suggestions.length === 0) {
    suggestions.push(t('suggAllCalm', locale));
  }

  return suggestions;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}
