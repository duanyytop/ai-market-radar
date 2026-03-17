import type { ProtocolTvl, StablecoinSupply, DexVolume } from '../types.js';

const LLAMA_API = 'https://api.llama.fi';
const STABLECOINS_API = 'https://stablecoins.llama.fi';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`DeFiLlama API error: ${res.status} ${res.statusText} (${url})`);
  }
  return res.json() as Promise<T>;
}

interface LlamaProtocol {
  name: string;
  tvl: number;
  change_1d: number | null;
  change_7d: number | null;
  category: string;
}

export async function getProtocolTvls(topN: number = 5): Promise<{
  gainers: ProtocolTvl[];
  losers: ProtocolTvl[];
}> {
  const protocols = await fetchJson<LlamaProtocol[]>(`${LLAMA_API}/protocols`);

  // Filter out tiny protocols and those without 1d change data
  const valid = protocols.filter(
    (p) => p.tvl > 10_000_000 && p.change_1d !== null && p.change_1d !== undefined,
  );

  const sorted = valid.sort((a, b) => (b.change_1d ?? 0) - (a.change_1d ?? 0));

  const toTvl = (p: LlamaProtocol): ProtocolTvl => ({
    name: p.name,
    tvl: p.tvl,
    tvlChange1d: p.change_1d ?? 0,
    tvlChange7d: p.change_7d ?? 0,
    category: p.category ?? 'Unknown',
  });

  return {
    gainers: sorted.slice(0, topN).map(toTvl),
    losers: sorted.slice(-topN).reverse().map(toTvl),
  };
}

interface LlamaStablecoin {
  id: string;
  name: string;
  symbol: string;
  circulating: { peggedUSD: number };
  circulatingPrevDay: { peggedUSD: number };
  circulatingPrevWeek: { peggedUSD: number };
}

export async function getStablecoinSupply(): Promise<StablecoinSupply[]> {
  const data = await fetchJson<{ peggedAssets: LlamaStablecoin[] }>(
    `${STABLECOINS_API}/stablecoins?includePrices=true`,
  );

  // Focus on major stablecoins
  const targets = ['USDT', 'USDC', 'DAI'];
  const results: StablecoinSupply[] = [];

  for (const stable of data.peggedAssets) {
    if (!targets.includes(stable.symbol)) continue;

    const current = stable.circulating?.peggedUSD ?? 0;
    const prevDay = stable.circulatingPrevDay?.peggedUSD ?? current;
    const prevWeek = stable.circulatingPrevWeek?.peggedUSD ?? current;

    results.push({
      name: stable.name,
      symbol: stable.symbol,
      totalSupply: current,
      supplyChange1d: prevDay > 0 ? ((current - prevDay) / prevDay) * 100 : 0,
      supplyChange7d: prevWeek > 0 ? ((current - prevWeek) / prevWeek) * 100 : 0,
    });
  }

  // Sort by market cap
  results.sort((a, b) => b.totalSupply - a.totalSupply);
  return results;
}

interface LlamaDexOverview {
  protocols: Array<{
    name: string;
    total24h: number | null;
    change_1d: number | null;
  }>;
}

export async function getDexVolumes(topN: number = 10): Promise<DexVolume[]> {
  const data = await fetchJson<LlamaDexOverview>(
    `${LLAMA_API}/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
  );

  const valid = data.protocols
    .filter((p) => p.total24h !== null && p.total24h! > 0)
    .sort((a, b) => (b.total24h ?? 0) - (a.total24h ?? 0))
    .slice(0, topN);

  return valid.map((p) => ({
    name: p.name,
    volume24h: p.total24h ?? 0,
    volumeChange1d: p.change_1d ?? 0,
  }));
}
