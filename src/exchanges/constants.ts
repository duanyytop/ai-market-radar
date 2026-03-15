import type { ChainName, ExchangeAddress } from '../types.js';

// Known exchange addresses per chain
// Sources: Etherscan labels, Arkham Intelligence public data
export const EXCHANGE_ADDRESSES: Record<ChainName, ExchangeAddress[]> = {
  ethereum: [
    // --- CEX ---
    // Binance
    {
      address: '0x28C6c06298d514Db089934071355E5743bf21d60',
      label: 'Binance Hot Wallet',
      type: 'cex',
      exchange: 'Binance',
    },
    {
      address: '0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549',
      label: 'Binance Hot Wallet 2',
      type: 'cex',
      exchange: 'Binance',
    },
    {
      address: '0xDFd5293D8e347dFe59E90eFd55b2956a1343963d',
      label: 'Binance Hot Wallet 3',
      type: 'cex',
      exchange: 'Binance',
    },
    // Coinbase
    {
      address: '0x503828976D22510aad0201ac7EC88293211D23Da',
      label: 'Coinbase Hot Wallet',
      type: 'cex',
      exchange: 'Coinbase',
    },
    {
      address: '0xA9D1e08C7793af67e9d92fe308d5697FB81d3E43',
      label: 'Coinbase Commerce',
      type: 'cex',
      exchange: 'Coinbase',
    },
    // Kraken
    {
      address: '0x2910543Af39abA0Cd09dBb2D50200b3E800A63D2',
      label: 'Kraken Hot Wallet',
      type: 'cex',
      exchange: 'Kraken',
    },
    {
      address: '0xAe2D4617c862309A3d75A0fFB358c7a5009c673F',
      label: 'Kraken Hot Wallet 2',
      type: 'cex',
      exchange: 'Kraken',
    },
    // OKX
    {
      address: '0x6cC5F688a315f3dC28A7781717a9A798a59fDA7b',
      label: 'OKX Hot Wallet',
      type: 'cex',
      exchange: 'OKX',
    },
    {
      address: '0x236F233dBf78341d7B82a4CFc01C8Ee711127c23',
      label: 'OKX Hot Wallet 2',
      type: 'cex',
      exchange: 'OKX',
    },
    // Bybit
    {
      address: '0xf89d7b9c864f589bbF53a82105107622B35EaA40',
      label: 'Bybit Hot Wallet',
      type: 'cex',
      exchange: 'Bybit',
    },

    // --- DEX ---
    // Uniswap
    {
      address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      label: 'Uniswap V2 Router',
      type: 'dex',
      exchange: 'Uniswap',
    },
    {
      address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      label: 'Uniswap V3 Router',
      type: 'dex',
      exchange: 'Uniswap',
    },
    {
      address: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
      label: 'Uniswap Universal Router',
      type: 'dex',
      exchange: 'Uniswap',
    },
    // 1inch
    {
      address: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      label: '1inch V5 Router',
      type: 'dex',
      exchange: '1inch',
    },
    // Curve
    {
      address: '0x99a58482BD75cbab83b27EC03CA68fF489b5788f',
      label: 'Curve Router',
      type: 'dex',
      exchange: 'Curve',
    },
  ],

  arbitrum: [
    // --- CEX ---
    {
      address: '0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D',
      label: 'Binance Arbitrum Hot Wallet',
      type: 'cex',
      exchange: 'Binance',
    },
    {
      address: '0xa9d1e08C7793af67e9d92fe308d5697FB81d3E43',
      label: 'Coinbase Arbitrum',
      type: 'cex',
      exchange: 'Coinbase',
    },
    {
      address: '0x6cC5F688a315f3dC28A7781717a9A798a59fDA7b',
      label: 'OKX Arbitrum',
      type: 'cex',
      exchange: 'OKX',
    },
    {
      address: '0xf89d7b9c864f589bbF53a82105107622B35EaA40',
      label: 'Bybit Arbitrum',
      type: 'cex',
      exchange: 'Bybit',
    },

    // --- DEX ---
    {
      address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      label: 'Uniswap V3 Router',
      type: 'dex',
      exchange: 'Uniswap',
    },
    {
      address: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
      label: 'Uniswap Universal Router',
      type: 'dex',
      exchange: 'Uniswap',
    },
    {
      address: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      label: '1inch V5 Router',
      type: 'dex',
      exchange: '1inch',
    },
  ],

  base: [
    // --- CEX ---
    {
      address: '0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A',
      label: 'Coinbase Base Hot Wallet',
      type: 'cex',
      exchange: 'Coinbase',
    },

    // --- DEX ---
    {
      address: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
      label: 'Uniswap Universal Router',
      type: 'dex',
      exchange: 'Uniswap',
    },
    {
      address: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      label: '1inch V5 Router',
      type: 'dex',
      exchange: '1inch',
    },
  ],
};

// Build a fast lookup map: lowercase address -> ExchangeAddress
const addressLookupCache = new Map<ChainName, Map<string, ExchangeAddress>>();

export function getExchangeLookup(chain: ChainName): Map<string, ExchangeAddress> {
  const cached = addressLookupCache.get(chain);
  if (cached) return cached;

  const lookup = new Map<string, ExchangeAddress>();
  for (const entry of EXCHANGE_ADDRESSES[chain]) {
    lookup.set(entry.address.toLowerCase(), entry);
  }
  addressLookupCache.set(chain, lookup);
  return lookup;
}
