import { describe, it, expect } from 'vitest';
import { t } from '../report/i18n.js';

describe('daily-report formatting', () => {
  it('all i18n keys return non-empty strings for both locales', () => {
    const keys: Array<Parameters<typeof t>[0]> = [
      'reportTitle',
      'generatedAt',
      'chains',
      'sectionExchangeFlows',
      'sectionStablecoin',
      'sectionWhale',
      'sectionMarketSignals',
      'sectionSuggestions',
      'cexFlows',
      'dexFlows',
      'totalInflow',
      'totalOutflow',
      'netInflow',
      'netOutflow',
      'noExchangeData',
      'stablecoinBullish',
      'stablecoinBearish',
      'stablecoinNeutral',
      'noStablecoinData',
      'whaleToExchange',
      'whaleFromExchange',
      'whaleTransfer',
      'noWhaleData',
      'bullish',
      'bearish',
      'neutral',
      'info',
      'notable',
      'significant',
      'suggCexInflow',
      'suggCexOutflow',
      'suggStableInflow',
      'suggStableOutflow',
      'suggWhaleAlert',
      'suggAllCalm',
      'disclaimer',
    ];

    for (const key of keys) {
      expect(t(key, 'en').length).toBeGreaterThan(0);
      expect(t(key, 'zh').length).toBeGreaterThan(0);
    }
  });

  it('suggestion texts are distinct between locales', () => {
    expect(t('suggCexInflow', 'en')).not.toBe(t('suggCexInflow', 'zh'));
    expect(t('suggCexOutflow', 'en')).not.toBe(t('suggCexOutflow', 'zh'));
    expect(t('suggWhaleAlert', 'en')).not.toBe(t('suggWhaleAlert', 'zh'));
    expect(t('suggAllCalm', 'en')).not.toBe(t('suggAllCalm', 'zh'));
  });
});
