import { z } from 'zod';

export const ConfigSchema = z.object({
  coingecko: z
    .object({
      apiKey: z.string().optional(),
    })
    .optional(),
  llm: z
    .object({
      provider: z.enum(['anthropic', 'openai']).default('anthropic'),
      apiKey: z.string().optional(),
      model: z.string().default('claude-sonnet-4-5-20250514'),
      baseURL: z.string().optional(),
    })
    .optional(),
});
export type DefiRadarConfig = z.infer<typeof ConfigSchema>;

export interface MarketOverview {
  btcPrice: number;
  btcChange24h: number;
  ethPrice: number;
  ethChange24h: number;
  totalMarketCap: number;
  marketCapChange24h: number;
  totalVolume24h: number;
}

export interface ProtocolTvl {
  name: string;
  tvl: number;
  tvlChange1d: number;
  tvlChange7d: number;
  category: string;
}

export interface StablecoinSupply {
  name: string;
  symbol: string;
  totalSupply: number;
  supplyChange1d: number;
  supplyChange7d: number;
}

export interface DexVolume {
  name: string;
  volume24h: number;
  volumeChange1d: number;
}

export interface MarketSignal {
  type: 'price' | 'tvl' | 'stablecoin' | 'dex_volume';
  severity: 'info' | 'notable' | 'significant';
  signal: 'bullish' | 'bearish' | 'neutral';
  message: string;
}

export interface ReportData {
  market: MarketOverview;
  topTvlGainers: ProtocolTvl[];
  topTvlLosers: ProtocolTvl[];
  stablecoins: StablecoinSupply[];
  dexVolumes: DexVolume[];
  signals: MarketSignal[];
}
