import { describe, it, expect } from 'vitest';
import { KNOWN_TOKENS, DEFAULT_RPC_URLS, NATIVE_TOKEN_SYMBOL } from '../chains/constants.js';

describe('Chain Constants', () => {
  it('has USDC and WETH for all chains', () => {
    for (const chain of ['ethereum', 'arbitrum', 'base'] as const) {
      expect(KNOWN_TOKENS[chain].USDC || KNOWN_TOKENS[chain].USDbC).toBeDefined();
      expect(KNOWN_TOKENS[chain].WETH).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  it('has default RPC URLs for all chains', () => {
    expect(DEFAULT_RPC_URLS.ethereum).toContain('http');
    expect(DEFAULT_RPC_URLS.arbitrum).toContain('http');
    expect(DEFAULT_RPC_URLS.base).toContain('http');
  });

  it('has native token symbols for all chains', () => {
    expect(NATIVE_TOKEN_SYMBOL.ethereum).toBe('ETH');
    expect(NATIVE_TOKEN_SYMBOL.arbitrum).toBe('ETH');
    expect(NATIVE_TOKEN_SYMBOL.base).toBe('ETH');
  });
});
