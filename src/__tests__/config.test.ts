import { describe, it, expect } from 'vitest';
import { ConfigSchema } from '../types.js';

describe('ConfigSchema', () => {
  it('validates a minimal empty config', () => {
    const result = ConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates config with chains', () => {
    const config = {
      chains: {
        ethereum: { rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/key' },
      },
    };
    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects invalid chain RPC URL', () => {
    const config = {
      chains: {
        ethereum: { rpcUrl: 'not-a-url' },
      },
    };
    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('applies default monitoring values', () => {
    const config = { monitoring: {} };
    const result = ConfigSchema.parse(config);
    expect(result.monitoring?.tokens).toEqual(['USDC', 'USDT', 'WETH', 'WBTC', 'DAI']);
    expect(result.monitoring?.chains).toEqual(['ethereum', 'arbitrum', 'base']);
    expect(result.monitoring?.whaleThresholdUsd).toBe(100_000);
  });

  it('accepts full config', () => {
    const config = {
      chains: {
        ethereum: { rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/key' },
        arbitrum: { rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/key' },
      },
      coingecko: { apiKey: 'test-key' },
      monitoring: {
        tokens: ['WETH', 'USDC'],
        chains: ['ethereum'],
        whaleThresholdUsd: 500_000,
      },
    };
    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects invalid chain name in monitoring', () => {
    const config = {
      monitoring: {
        chains: ['solana'],
      },
    };
    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts config with coingecko key', () => {
    const config = {
      coingecko: { apiKey: 'my-key' },
    };
    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
