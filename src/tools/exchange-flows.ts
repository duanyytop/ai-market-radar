import type { DefiRadarConfig, ChainName, ExchangeFlowResult } from '../types.js';
import { getClient, KNOWN_TOKENS } from '../chains/index.js';
import { getExchangeFlows } from '../exchanges/index.js';
import { getTokenPrices } from '../pricing/coingecko.js';

export async function getExchangeFlowsTool(
  config: DefiRadarConfig,
  chain?: string,
  token?: string,
  exchange?: string,
  blocks?: number,
  includePrices: boolean = true,
): Promise<string> {
  const chains: ChainName[] = chain && chain !== 'all' ? [chain as ChainName] : ['ethereum'];

  // Resolve token symbol to address if provided
  let tokenAddress: `0x${string}` | undefined;
  if (token) {
    for (const chainName of chains) {
      const addr = KNOWN_TOKENS[chainName]?.[token.toUpperCase()];
      if (addr) {
        tokenAddress = addr;
        break;
      }
    }
    if (!tokenAddress) {
      return `Unknown token symbol: ${token}. Supported: ${Object.keys(KNOWN_TOKENS.ethereum).join(', ')}`;
    }
  }

  const results: ExchangeFlowResult[] = [];

  for (const chainName of chains) {
    try {
      const client = getClient(chainName, config);
      const result = await getExchangeFlows(client, chainName, {
        token: tokenAddress,
        exchange,
        blocks,
      });
      results.push(result);
    } catch (err) {
      results.push({
        chain: chainName,
        blockRange: { from: 0n, to: 0n },
        flows: [],
        summary: { totalInflowUsd: 0, totalOutflowUsd: 0, netFlowUsd: 0 },
      });
    }
  }

  // Fetch USD prices if requested
  if (includePrices) {
    const allSymbols = new Set<string>();
    for (const r of results) {
      for (const f of r.flows) allSymbols.add(f.token);
    }

    try {
      const prices = await getTokenPrices(Array.from(allSymbols), config.coingecko?.apiKey);

      for (const r of results) {
        let totalIn = 0;
        let totalOut = 0;
        for (const f of r.flows) {
          const price = prices[f.token.toUpperCase()] ?? 0;
          f.inflowUsd = parseFloat(f.inflow) * price;
          f.outflowUsd = parseFloat(f.outflow) * price;
          totalIn += f.inflowUsd;
          totalOut += f.outflowUsd;
        }
        r.summary.totalInflowUsd = totalIn;
        r.summary.totalOutflowUsd = totalOut;
        r.summary.netFlowUsd = totalIn - totalOut;
      }
    } catch {
      // Price fetch failed, continue without prices
    }
  }

  return formatFlows(results);
}

function formatFlows(results: ExchangeFlowResult[]): string {
  const lines: string[] = [];
  lines.push('Exchange Fund Flows');
  lines.push('');

  for (const r of results) {
    lines.push(
      `--- ${r.chain.toUpperCase()} (blocks ${r.blockRange.from.toString()}–${r.blockRange.to.toString()}) ---`,
    );

    if (r.flows.length === 0) {
      lines.push('  No exchange transfers detected in this block range.');
      lines.push('');
      continue;
    }

    // Group by CEX/DEX
    const cexFlows = r.flows.filter((f) => f.type === 'cex');
    const dexFlows = r.flows.filter((f) => f.type === 'dex');

    if (cexFlows.length > 0) {
      lines.push('  CEX Flows:');
      for (const f of cexFlows) {
        lines.push(`    ${f.exchange} | ${f.token}`);
        lines.push(
          `      In:  ${formatAmount(f.inflow)}${f.inflowUsd !== undefined ? ` ($${f.inflowUsd.toFixed(2)})` : ''}`,
        );
        lines.push(
          `      Out: ${formatAmount(f.outflow)}${f.outflowUsd !== undefined ? ` ($${f.outflowUsd.toFixed(2)})` : ''}`,
        );
        lines.push(`      Net: ${formatAmount(f.netFlow)}`);
      }
      lines.push('');
    }

    if (dexFlows.length > 0) {
      lines.push('  DEX Flows:');
      for (const f of dexFlows) {
        lines.push(`    ${f.exchange} | ${f.token}`);
        lines.push(
          `      In:  ${formatAmount(f.inflow)}${f.inflowUsd !== undefined ? ` ($${f.inflowUsd.toFixed(2)})` : ''}`,
        );
        lines.push(
          `      Out: ${formatAmount(f.outflow)}${f.outflowUsd !== undefined ? ` ($${f.outflowUsd.toFixed(2)})` : ''}`,
        );
        lines.push(`      Net: ${formatAmount(f.netFlow)}`);
      }
      lines.push('');
    }

    if (r.summary.totalInflowUsd > 0 || r.summary.totalOutflowUsd > 0) {
      const netDirection = r.summary.netFlowUsd >= 0 ? 'Net Inflow' : 'Net Outflow';
      lines.push(`  Summary:`);
      lines.push(`    Total Inflow:  $${r.summary.totalInflowUsd.toFixed(2)}`);
      lines.push(`    Total Outflow: $${r.summary.totalOutflowUsd.toFixed(2)}`);
      lines.push(`    ${netDirection}: $${Math.abs(r.summary.netFlowUsd).toFixed(2)}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function formatAmount(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return '0';
  if (Math.abs(num) < 0.0001) return num < 0 ? '<-0.0001' : '<0.0001';
  if (Math.abs(num) < 1) return num.toFixed(6);
  if (Math.abs(num) < 1000) return num.toFixed(4);
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
