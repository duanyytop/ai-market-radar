import { z } from 'zod';

export const ChainName = z.enum(['ethereum', 'arbitrum', 'base']);
export type ChainName = z.infer<typeof ChainName>;

export const WalletSchema = z.object({
  label: z.string().optional(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chains: z.array(ChainName).default(['ethereum', 'arbitrum', 'base']),
});
export type Wallet = z.infer<typeof WalletSchema>;

export const ChainConfigSchema = z.object({
  rpcUrl: z.string().url(),
});

export const ConfigSchema = z.object({
  wallets: z.array(WalletSchema).min(1, 'At least one wallet is required'),
  chains: z.record(ChainName, ChainConfigSchema).optional(),
  coingecko: z
    .object({
      apiKey: z.string().optional(),
    })
    .optional(),
  alerts: z
    .object({
      aaveHealthFactorThreshold: z.number().default(1.5),
    })
    .optional(),
  tokens: z.record(ChainName, z.array(z.string())).optional(),
});
export type DefiRadarConfig = z.infer<typeof ConfigSchema>;

export interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  decimals: number;
  usdValue?: number;
}

export interface WalletBalances {
  chain: ChainName;
  nativeBalance: string;
  nativeUsdValue?: number;
  tokens: TokenBalance[];
  totalUsdValue?: number;
}

export interface AavePosition {
  chain: ChainName;
  totalCollateralUsd: number;
  totalDebtUsd: number;
  availableBorrowsUsd: number;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: number;
  isAtRisk: boolean;
}

export interface UniswapV3Position {
  tokenId: string;
  chain: ChainName;
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  liquidity: string;
  inRange: boolean;
}

export interface Alert {
  type: 'aave_health_factor';
  severity: 'warning' | 'critical';
  chain: ChainName;
  message: string;
  value: number;
  threshold: number;
}

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
