import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProtocolTvls, getStablecoinSupply, getDexVolumes } from '../data/defillama.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('DeFiLlama: getProtocolTvls', () => {
  it('returns sorted gainers and losers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { name: 'Aave', tvl: 20e9, change_1d: 5.2, change_7d: 10, category: 'Lending' },
          { name: 'Lido', tvl: 30e9, change_1d: -3.1, change_7d: -5, category: 'Liquid Staking' },
          { name: 'Uniswap', tvl: 10e9, change_1d: 2.0, change_7d: 1, category: 'DEX' },
          { name: 'Small', tvl: 1000, change_1d: 50, change_7d: 100, category: 'Other' }, // filtered out (tvl < 10M)
        ]),
    });

    const { gainers, losers } = await getProtocolTvls(2);
    expect(gainers).toHaveLength(2);
    expect(gainers[0].name).toBe('Aave');
    expect(gainers[0].tvlChange1d).toBe(5.2);
    expect(losers).toHaveLength(2);
    expect(losers[0].name).toBe('Lido');
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });
    await expect(getProtocolTvls()).rejects.toThrow('DeFiLlama API error');
  });
});

describe('DeFiLlama: getStablecoinSupply', () => {
  it('returns USDT and USDC data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          peggedAssets: [
            {
              id: '1', name: 'Tether', symbol: 'USDT',
              circulating: { peggedUSD: 110e9 },
              circulatingPrevDay: { peggedUSD: 109e9 },
              circulatingPrevWeek: { peggedUSD: 107e9 },
            },
            {
              id: '2', name: 'USD Coin', symbol: 'USDC',
              circulating: { peggedUSD: 50e9 },
              circulatingPrevDay: { peggedUSD: 49.5e9 },
              circulatingPrevWeek: { peggedUSD: 48e9 },
            },
            {
              id: '3', name: 'Some Random', symbol: 'XYZ',
              circulating: { peggedUSD: 1e6 },
              circulatingPrevDay: { peggedUSD: 1e6 },
              circulatingPrevWeek: { peggedUSD: 1e6 },
            },
          ],
        }),
    });

    const result = await getStablecoinSupply();
    expect(result).toHaveLength(2); // Only USDT and USDC (DAI not in mock)
    expect(result[0].symbol).toBe('USDT'); // Sorted by supply
    expect(result[0].supplyChange1d).toBeCloseTo(0.917, 1);
  });
});

describe('DeFiLlama: getDexVolumes', () => {
  it('returns sorted DEX volumes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          protocols: [
            { name: 'Uniswap', total24h: 2e9, change_1d: 10 },
            { name: 'Curve', total24h: 500e6, change_1d: -5 },
            { name: 'Dead DEX', total24h: null, change_1d: null },
          ],
        }),
    });

    const result = await getDexVolumes(5);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Uniswap');
    expect(result[0].volume24h).toBe(2e9);
  });
});
