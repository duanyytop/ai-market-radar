import type { DefiRadarConfig, ChainName, StablecoinFlow } from '../types.js';
import { getClient, KNOWN_TOKENS } from '../chains/index.js';
import { getExchangeFlows } from '../exchanges/index.js';
import { getTokenPrices } from '../pricing/coingecko.js';

const STABLECOINS = ['USDC', 'USDT', 'DAI', 'USDC.e', 'USDbC'];

export async function getStablecoinFlowsTool(
  config: DefiRadarConfig,
  chain?: string,
  blocks?: number,
): Promise<string> {
  const chains: ChainName[] =
    chain && chain !== 'all'
      ? [chain as ChainName]
      : config.monitoring?.chains ?? ['ethereum'];

  const results: StablecoinFlow[] = [];

  for (const chainName of chains) {
    const knownTokens = KNOWN_TOKENS[chainName] ?? {};
    const stableAddresses = Object.entries(knownTokens)
      .filter(([sym]) => STABLECOINS.includes(sym))
      .map(([sym, addr]) => ({ symbol: sym, address: addr as `0x${string}` }));

    if (stableAddresses.length === 0) continue;

    for (const stable of stableAddresses) {
      try {
        const client = getClient(chainName, config);
        const flowResult = await getExchangeFlows(client, chainName, {
          token: stable.address,
          blocks,
        });

        let totalInflow = 0;
        let totalOutflow = 0;
        for (const f of flowResult.flows) {
          totalInflow += parseFloat(f.inflow);
          totalOutflow += parseFloat(f.outflow);
        }

        const netFlow = totalInflow - totalOutflow;
        // For stablecoins, 1 token ≈ $1
        const signal: StablecoinFlow['signal'] =
          netFlow > 10_000 ? 'bullish' : netFlow < -10_000 ? 'bearish' : 'neutral';

        results.push({
          token: stable.symbol,
          chain: chainName,
          netMintBurn: '0',
          exchangeNetFlow: netFlow.toFixed(2),
          netMintBurnUsd: 0,
          exchangeNetFlowUsd: netFlow,
          signal,
        });
      } catch {
        // skip
      }
    }
  }

  return formatStablecoinFlows(results);
}

function formatStablecoinFlows(flows: StablecoinFlow[]): string {
  const lines: string[] = [];
  lines.push('Stablecoin Exchange Flows');
  lines.push('');

  if (flows.length === 0) {
    lines.push('No stablecoin flow data available.');
    return lines.join('\n');
  }

  const signalEmoji = { bullish: '[BULLISH]', bearish: '[BEARISH]', neutral: '[NEUTRAL]' };

  for (const f of flows) {
    const direction = f.exchangeNetFlowUsd >= 0 ? 'Net Inflow' : 'Net Outflow';
    lines.push(
      `  ${f.chain.toUpperCase()} | ${f.token}: ${direction} $${Math.abs(f.exchangeNetFlowUsd).toLocaleString('en-US', { maximumFractionDigits: 0 })} ${signalEmoji[f.signal]}`,
    );
  }

  lines.push('');
  lines.push('Signal guide:');
  lines.push('  [BULLISH]  = Stablecoins flowing INTO exchanges (potential buying demand)');
  lines.push('  [BEARISH]  = Stablecoins flowing OUT of exchanges (reduced trading interest)');
  lines.push('  [NEUTRAL]  = Minimal net movement');

  return lines.join('\n');
}
