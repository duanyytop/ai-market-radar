import type { DefiRadarConfig, ChainName, ExchangeFlowResult, StablecoinFlow, WhaleMovement, MarketSignal } from '../types.js';
import { getClient, KNOWN_TOKENS } from '../chains/index.js';
import { getExchangeFlows } from '../exchanges/index.js';
import { getTokenPrices } from '../pricing/coingecko.js';
import { getExchangeLookup } from '../exchanges/constants.js';
import { formatUnits, parseAbiItem } from 'viem';
import { type Locale, t } from './i18n.js';

const STABLECOINS = ['USDC', 'USDT', 'DAI', 'USDC.e', 'USDbC'];
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);
const ERC20_DECIMALS_ABI = [
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;

export async function generateDailyReport(
  config: DefiRadarConfig,
  locale: Locale = 'en',
  chain?: string,
): Promise<string> {
  const chains: ChainName[] =
    chain && chain !== 'all'
      ? [chain as ChainName]
      : config.monitoring?.chains ?? ['ethereum', 'arbitrum', 'base'];
  const whaleThreshold = config.monitoring?.whaleThresholdUsd ?? 100_000;

  // Collect all data in parallel where possible
  const [exchangeFlows, stablecoinFlows, whaleMovements] = await Promise.all([
    collectExchangeFlows(config, chains),
    collectStablecoinFlows(config, chains),
    collectWhaleMovements(config, chains, whaleThreshold),
  ]);

  const signals = deriveSignals(exchangeFlows, stablecoinFlows, whaleMovements);

  return formatReport(locale, chains, exchangeFlows, stablecoinFlows, whaleMovements, signals);
}

async function collectExchangeFlows(
  config: DefiRadarConfig,
  chains: ChainName[],
): Promise<ExchangeFlowResult[]> {
  const results: ExchangeFlowResult[] = [];
  for (const chainName of chains) {
    try {
      const client = getClient(chainName, config);
      const result = await getExchangeFlows(client, chainName, { blocks: 500 });
      console.error(`[${chainName}] exchange flows: ${result.flows.length} flows found`);

      // Enrich with prices
      const symbols = new Set(result.flows.map((f) => f.token));
      if (symbols.size > 0) {
        try {
          const prices = await getTokenPrices(Array.from(symbols), config.coingecko?.apiKey);
          let totalIn = 0;
          let totalOut = 0;
          for (const f of result.flows) {
            const price = prices[f.token.toUpperCase()] ?? 0;
            f.inflowUsd = parseFloat(f.inflow) * price;
            f.outflowUsd = parseFloat(f.outflow) * price;
            totalIn += f.inflowUsd;
            totalOut += f.outflowUsd;
          }
          result.summary = { totalInflowUsd: totalIn, totalOutflowUsd: totalOut, netFlowUsd: totalIn - totalOut };
        } catch (err) {
          console.error(`[${chainName}] price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      results.push(result);
    } catch (err) {
      console.error(`[${chainName}] collectExchangeFlows failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return results;
}

async function collectStablecoinFlows(
  config: DefiRadarConfig,
  chains: ChainName[],
): Promise<StablecoinFlow[]> {
  const results: StablecoinFlow[] = [];
  for (const chainName of chains) {
    const knownTokens = KNOWN_TOKENS[chainName] ?? {};
    const stables = Object.entries(knownTokens).filter(([sym]) => STABLECOINS.includes(sym));

    for (const [symbol, address] of stables) {
      try {
        const client = getClient(chainName, config);
        const flowResult = await getExchangeFlows(client, chainName, {
          token: address as `0x${string}`,
          blocks: 500,
        });

        let totalInflow = 0;
        let totalOutflow = 0;
        for (const f of flowResult.flows) {
          totalInflow += parseFloat(f.inflow);
          totalOutflow += parseFloat(f.outflow);
        }
        const netFlow = totalInflow - totalOutflow;
        const signal: StablecoinFlow['signal'] =
          netFlow > 10_000 ? 'bullish' : netFlow < -10_000 ? 'bearish' : 'neutral';

        results.push({
          token: symbol,
          chain: chainName,
          netMintBurn: '0',
          exchangeNetFlow: netFlow.toFixed(2),
          netMintBurnUsd: 0,
          exchangeNetFlowUsd: netFlow,
          signal,
        });
      } catch (err) {
        console.error(`[${chainName}] stablecoin ${symbol} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  return results;
}

async function collectWhaleMovements(
  config: DefiRadarConfig,
  chains: ChainName[],
  thresholdUsd: number,
): Promise<WhaleMovement[]> {
  const monitoredTokens = config.monitoring?.tokens ?? ['USDC', 'USDT', 'WETH', 'WBTC', 'DAI'];
  let prices: Record<string, number> = {};
  try {
    prices = await getTokenPrices(monitoredTokens, config.coingecko?.apiKey);
    console.error(`[whale] prices fetched: ${JSON.stringify(prices)}`);
  } catch (err) {
    console.error(`[whale] price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }

  const movements: WhaleMovement[] = [];

  for (const chainName of chains) {
    const client = getClient(chainName, config);
    const exchangeLookup = getExchangeLookup(chainName);
    const knownTokens = KNOWN_TOKENS[chainName] ?? {};

    const tokenEntries = Object.entries(knownTokens).filter(
      ([sym]) => monitoredTokens.includes(sym.toUpperCase()),
    );

    for (const [symbol, tokenAddress] of tokenEntries) {
      const price = prices[symbol.toUpperCase()] ?? 0;
      if (price === 0) continue;

      try {
        const latestBlock = await client.getBlockNumber();
        const fromBlock = latestBlock - 200n;

        let decimals: number;
        try {
          decimals = await client.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_DECIMALS_ABI,
            functionName: 'decimals',
          });
        } catch (err) {
          console.error(`[${chainName}] whale decimals failed for ${symbol}: ${err instanceof Error ? err.message : String(err)}`);
          continue;
        }

        const minTokenAmount = thresholdUsd / price;
        const logs = await client.getLogs({
          event: TRANSFER_EVENT,
          address: tokenAddress as `0x${string}`,
          fromBlock,
          toBlock: latestBlock,
        });

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
            chain: chainName,
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
        console.error(`[${chainName}] whale scan failed for ${symbol}: ${err instanceof Error ? err.message : String(err)}`);
      }
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
