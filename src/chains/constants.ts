import type { ChainName } from '../types.js';

export const DEFAULT_RPC_URLS: Record<ChainName, string> = {
  ethereum: 'https://eth.llamarpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  base: 'https://mainnet.base.org',
};

export const NATIVE_TOKEN_COINGECKO_ID: Record<ChainName, string> = {
  ethereum: 'ethereum',
  arbitrum: 'ethereum',
  base: 'ethereum',
};

export const NATIVE_TOKEN_SYMBOL: Record<ChainName, string> = {
  ethereum: 'ETH',
  arbitrum: 'ETH',
  base: 'ETH',
};

// Well-known ERC-20 token addresses per chain
export const KNOWN_TOKENS: Record<ChainName, Record<string, `0x${string}`>> = {
  ethereum: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  },
  arbitrum: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'USDC.e': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    WETH: '0x4200000000000000000000000000000000000006',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  },
};
