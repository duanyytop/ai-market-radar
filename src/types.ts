import { z } from 'zod';

export const ChainName = z.enum(['ethereum', 'arbitrum', 'base']);
export type ChainName = z.infer<typeof ChainName>;

export const ChainConfigSchema = z.object({
  rpcUrl: z.string().url(),
});

export const ConfigSchema = z.object({
  chains: z.record(ChainName, ChainConfigSchema).optional(),
  coingecko: z
    .object({
      apiKey: z.string().optional(),
    })
    .optional(),
  monitoring: z
    .object({
      tokens: z.array(z.string()).default(['USDC', 'USDT', 'WETH', 'WBTC', 'DAI']),
      chains: z.array(ChainName).default(['ethereum', 'arbitrum', 'base']),
      whaleThresholdUsd: z.number().default(100_000),
    })
    .optional(),
});
export type DefiRadarConfig = z.infer<typeof ConfigSchema>;

export interface ExchangeAddress {
  address: `0x${string}`;
  label: string;
  type: 'cex' | 'dex';
  exchange: string;
}

export interface ExchangeFlow {
  exchange: string;
  type: 'cex' | 'dex';
  token: string;
  inflow: string;
  outflow: string;
  netFlow: string;
  inflowUsd?: number;
  outflowUsd?: number;
}

export interface ExchangeFlowResult {
  chain: ChainName;
  blockRange: { from: bigint; to: bigint };
  flows: ExchangeFlow[];
  summary: {
    totalInflowUsd: number;
    totalOutflowUsd: number;
    netFlowUsd: number;
  };
}

export interface StablecoinFlow {
  token: string;
  chain: ChainName;
  netMintBurn: string;
  exchangeNetFlow: string;
  netMintBurnUsd: number;
  exchangeNetFlowUsd: number;
  signal: 'bullish' | 'bearish' | 'neutral';
}

export interface WhaleMovement {
  chain: ChainName;
  token: string;
  from: string;
  to: string;
  amount: string;
  amountUsd: number;
  txHash: string;
  direction: 'to_exchange' | 'from_exchange' | 'whale_transfer';
}

export interface MarketSignal {
  type: 'exchange_flow' | 'stablecoin' | 'whale';
  severity: 'info' | 'notable' | 'significant';
  signal: 'bullish' | 'bearish' | 'neutral';
  message: string;
}
