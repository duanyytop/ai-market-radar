import { describe, it, expect } from 'vitest';
import { EXCHANGE_ADDRESSES, getExchangeLookup } from '../exchanges/constants.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

describe('Exchange Constants', () => {
  it('has valid addresses for all exchange entries', () => {
    for (const chain of ['ethereum', 'arbitrum', 'base'] as const) {
      for (const entry of EXCHANGE_ADDRESSES[chain]) {
        expect(entry.address).toMatch(ADDRESS_RE);
      }
    }
  });

  it('has at least one CEX and one DEX entry for ethereum', () => {
    const eth = EXCHANGE_ADDRESSES.ethereum;
    expect(eth.some((e) => e.type === 'cex')).toBe(true);
    expect(eth.some((e) => e.type === 'dex')).toBe(true);
  });

  it('has at least one CEX and one DEX entry for arbitrum', () => {
    const arb = EXCHANGE_ADDRESSES.arbitrum;
    expect(arb.some((e) => e.type === 'cex')).toBe(true);
    expect(arb.some((e) => e.type === 'dex')).toBe(true);
  });

  it('has at least one entry for base', () => {
    expect(EXCHANGE_ADDRESSES.base.length).toBeGreaterThan(0);
  });

  it('has no duplicate addresses within the same chain', () => {
    for (const chain of ['ethereum', 'arbitrum', 'base'] as const) {
      const addresses = EXCHANGE_ADDRESSES[chain].map((e) => e.address.toLowerCase());
      const unique = new Set(addresses);
      expect(unique.size).toBe(addresses.length);
    }
  });

  it('has non-empty labels and exchange names', () => {
    for (const chain of ['ethereum', 'arbitrum', 'base'] as const) {
      for (const entry of EXCHANGE_ADDRESSES[chain]) {
        expect(entry.label.length).toBeGreaterThan(0);
        expect(entry.exchange.length).toBeGreaterThan(0);
      }
    }
  });

  it('builds a lookup map with lowercase keys', () => {
    const lookup = getExchangeLookup('ethereum');
    expect(lookup.size).toBe(EXCHANGE_ADDRESSES.ethereum.length);

    // All keys should be lowercase
    for (const key of lookup.keys()) {
      expect(key).toBe(key.toLowerCase());
    }
  });

  it('lookup map returns correct exchange info', () => {
    const lookup = getExchangeLookup('ethereum');
    const binanceAddr = '0x28C6c06298d514Db089934071355E5743bf21d60'.toLowerCase();
    const entry = lookup.get(binanceAddr);
    expect(entry).toBeDefined();
    expect(entry?.exchange).toBe('Binance');
    expect(entry?.type).toBe('cex');
  });
});
