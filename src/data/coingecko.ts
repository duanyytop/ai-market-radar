import type { MarketOverview } from '../types.js';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey;
  return headers;
}

async function fetchJson<T>(url: string, apiKey?: string): Promise<T> {
  const res = await fetch(url, { headers: buildHeaders(apiKey) });
  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

interface GlobalData {
  data: {
    total_market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_change_percentage_24h_usd: number;
  };
}

interface SimplePrice {
  [id: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

export async function getMarketOverview(apiKey?: string): Promise<MarketOverview> {
  const [priceData, globalData] = await Promise.all([
    fetchJson<SimplePrice>(
      `${COINGECKO_API}/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true`,
      apiKey,
    ),
    fetchJson<GlobalData>(`${COINGECKO_API}/global`, apiKey),
  ]);

  return {
    btcPrice: priceData.bitcoin?.usd ?? 0,
    btcChange24h: priceData.bitcoin?.usd_24h_change ?? 0,
    ethPrice: priceData.ethereum?.usd ?? 0,
    ethChange24h: priceData.ethereum?.usd_24h_change ?? 0,
    totalMarketCap: globalData.data.total_market_cap.usd,
    marketCapChange24h: globalData.data.market_cap_change_percentage_24h_usd,
    totalVolume24h: globalData.data.total_volume.usd,
  };
}
