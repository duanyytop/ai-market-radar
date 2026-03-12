const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Map common token symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'weth',
  BTC: 'bitcoin',
  WBTC: 'wrapped-bitcoin',
  USDC: 'usd-coin',
  'USDC.e': 'usd-coin',
  USDbC: 'bridged-usd-coin-base',
  USDT: 'tether',
  DAI: 'dai',
  LINK: 'chainlink',
  ARB: 'arbitrum',
};

interface CacheEntry {
  prices: Record<string, number>;
  expiry: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

export function resolveCoingeckoId(symbol: string): string | undefined {
  return SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()];
}

export async function getTokenPrices(
  symbols: string[],
  apiKey?: string,
): Promise<Record<string, number>> {
  // Check cache
  if (cache && Date.now() < cache.expiry) {
    const allCached = symbols.every(
      (s) => SYMBOL_TO_COINGECKO_ID[s.toUpperCase()] !== undefined &&
        cache!.prices[s.toUpperCase()] !== undefined,
    );
    if (allCached) {
      const result: Record<string, number> = {};
      for (const s of symbols) {
        result[s.toUpperCase()] = cache.prices[s.toUpperCase()] ?? 0;
      }
      return result;
    }
  }

  // Resolve symbols to CoinGecko IDs
  const idMap = new Map<string, string>(); // coingeckoId -> symbol
  for (const symbol of symbols) {
    const id = SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()];
    if (id) {
      idMap.set(id, symbol.toUpperCase());
    }
  }

  if (idMap.size === 0) return {};

  const ids = Array.from(idMap.keys()).join(',');
  const url = `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, { usd: number }>;

  const prices: Record<string, number> = {};
  for (const [id, symbol] of idMap) {
    prices[symbol] = data[id]?.usd ?? 0;
  }

  // Update cache
  cache = {
    prices: { ...(cache?.prices ?? {}), ...prices },
    expiry: Date.now() + CACHE_TTL_MS,
  };

  return prices;
}

export function clearPriceCache(): void {
  cache = null;
}
