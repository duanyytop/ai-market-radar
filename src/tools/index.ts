import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DefiRadarConfig } from '../types.js';
import { getExchangeFlowsTool } from './exchange-flows.js';
import { getStablecoinFlowsTool } from './stablecoin-flows.js';
import { getWhaleMovementsTool } from './whale-movements.js';
import { generateDailyReport } from '../report/daily-report.js';

export function registerTools(server: McpServer, config: DefiRadarConfig): void {
  server.tool(
    'get_exchange_flows',
    'Monitor token inflows and outflows to/from CEX and DEX exchanges. Large CEX inflows signal sell pressure; outflows signal accumulation.',
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

  server.tool(
    'get_stablecoin_flows',
    'Track stablecoin (USDC, USDT, DAI) net flows across exchanges. Stablecoin inflows to exchanges often signal buying demand; outflows suggest reduced trading interest.',
    {
      chain: z
        .enum(['ethereum', 'arbitrum', 'base', 'all'])
        .optional()
        .describe('Chain to query (default: ethereum)'),
      blocks: z
        .number()
        .optional()
        .describe('Number of recent blocks to scan (default: 1000, max: 5000)'),
    },
    async ({ chain, blocks }) => ({
      content: [
        {
          type: 'text' as const,
          text: await getStablecoinFlowsTool(config, chain, blocks),
        },
      ],
    }),
  );

  server.tool(
    'get_whale_movements',
    'Detect large token transfers (whale movements) above a USD threshold. Tracks transfers to/from exchanges and between whales.',
    {
      chain: z
        .enum(['ethereum', 'arbitrum', 'base', 'all'])
        .optional()
        .describe('Chain to query (default: ethereum)'),
      token: z
        .string()
        .optional()
        .describe('Token symbol to filter (e.g. WETH, WBTC)'),
      threshold_usd: z
        .number()
        .optional()
        .describe('Minimum USD value to flag as whale movement (default: from config or 100000)'),
      blocks: z
        .number()
        .optional()
        .describe('Number of recent blocks to scan (default: 500, max: 2000)'),
    },
    async ({ chain, token, threshold_usd, blocks }) => ({
      content: [
        {
          type: 'text' as const,
          text: await getWhaleMovementsTool(config, chain, token, threshold_usd, blocks),
        },
      ],
    }),
  );

  server.tool(
    'generate_daily_report',
    'Generate a bilingual (English/Chinese) daily DeFi market intelligence report with exchange flows, stablecoin analysis, whale movements, and actionable suggestions for investors.',
    {
      locale: z
        .enum(['en', 'zh'])
        .optional()
        .describe('Report language: "en" for English, "zh" for Chinese (default: en)'),
      chain: z
        .enum(['ethereum', 'arbitrum', 'base', 'all'])
        .optional()
        .describe('Chain to focus on (default: all configured chains)'),
    },
    async ({ locale, chain }) => ({
      content: [
        {
          type: 'text' as const,
          text: await generateDailyReport(config, locale ?? 'en', chain),
        },
      ],
    }),
  );
}
