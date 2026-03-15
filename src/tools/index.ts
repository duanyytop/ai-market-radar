import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DefiRadarConfig } from '../types.js';
import { getWalletBalances } from './wallet-balances.js';
import { getAaveHealth } from './aave-health.js';
import { getUniswapPositionsTool } from './uniswap-positions.js';
import { getPortfolioSummary } from './portfolio-summary.js';
import { checkAlerts } from './check-alerts.js';
import { getExchangeFlowsTool } from './exchange-flows.js';

export function registerTools(server: McpServer, config: DefiRadarConfig): void {
  server.tool(
    'get_wallet_balances',
    'Show ETH and ERC-20 token balances for a wallet across chains (Ethereum, Arbitrum, Base)',
    {
      address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/)
        .optional()
        .describe('Wallet address (defaults to first configured wallet)'),
      chain: z
        .enum(['ethereum', 'arbitrum', 'base', 'all'])
        .optional()
        .describe('Chain to query (default: all)'),
      include_prices: z
        .boolean()
        .optional()
        .describe('Include USD prices from CoinGecko (default: true)'),
    },
    async ({ address, chain, include_prices }) => ({
      content: [
        {
          type: 'text' as const,
          text: await getWalletBalances(config, address, chain, include_prices ?? true),
        },
      ],
    }),
  );

  server.tool(
    'get_aave_health',
    'Show Aave V3 lending position health factor, collateral, and debt for a wallet',
    {
      address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/)
        .optional()
        .describe('Wallet address (defaults to first configured wallet)'),
      chain: z
        .enum(['ethereum', 'arbitrum', 'base', 'all'])
        .optional()
        .describe('Chain to query (default: all)'),
    },
    async ({ address, chain }) => ({
      content: [
        {
          type: 'text' as const,
          text: await getAaveHealth(config, address, chain),
        },
      ],
    }),
  );

  server.tool(
    'get_uniswap_positions',
    'Show Uniswap V3 LP positions and whether they are in range or out of range',
    {
      address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/)
        .optional()
        .describe('Wallet address (defaults to first configured wallet)'),
      chain: z
        .enum(['ethereum', 'arbitrum', 'base', 'all'])
        .optional()
        .describe('Chain to query (default: all)'),
    },
    async ({ address, chain }) => ({
      content: [
        {
          type: 'text' as const,
          text: await getUniswapPositionsTool(config, address, chain),
        },
      ],
    }),
  );

  server.tool(
    'get_portfolio_summary',
    'Get a complete portfolio overview: token balances, Aave positions, and Uniswap V3 LP status across all chains',
    {
      address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/)
        .optional()
        .describe('Wallet address (defaults to first configured wallet)'),
    },
    async ({ address }) => ({
      content: [
        {
          type: 'text' as const,
          text: await getPortfolioSummary(config, address),
        },
      ],
    }),
  );

  server.tool(
    'check_alerts',
    'Check for DeFi risk alerts: Aave health factor warnings, out-of-range LP positions, etc.',
    {
      address: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/)
        .optional()
        .describe('Wallet address (defaults to first configured wallet)'),
    },
    async ({ address }) => ({
      content: [
        {
          type: 'text' as const,
          text: await checkAlerts(config, address),
        },
      ],
    }),
  );

  server.tool(
    'get_exchange_flows',
    'Monitor token inflows and outflows to/from centralized (CEX) and decentralized (DEX) exchanges. Detects fund movements by scanning ERC-20 Transfer events involving known exchange addresses.',
    {
      chain: z
        .enum(['ethereum', 'arbitrum', 'base', 'all'])
        .optional()
        .describe('Chain to query (default: ethereum)'),
      token: z
        .string()
        .optional()
        .describe('Token symbol to filter (e.g. USDC, WETH). Default: all known tokens'),
      exchange: z
        .string()
        .optional()
        .describe('Exchange name to filter (e.g. Binance, Uniswap, Coinbase)'),
      blocks: z
        .number()
        .optional()
        .describe('Number of recent blocks to scan (default: 1000, max: 5000)'),
      include_prices: z
        .boolean()
        .optional()
        .describe('Include USD values from CoinGecko (default: true)'),
    },
    async ({ chain, token, exchange, blocks, include_prices }) => ({
      content: [
        {
          type: 'text' as const,
          text: await getExchangeFlowsTool(
            config,
            chain,
            token,
            exchange,
            blocks,
            include_prices ?? true,
          ),
        },
      ],
    }),
  );
}
