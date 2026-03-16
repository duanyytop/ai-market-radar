import { describe, it, expect } from 'vitest';
import { t, type Locale } from '../report/i18n.js';

describe('i18n', () => {
  it('returns English translations', () => {
    expect(t('reportTitle', 'en')).toBe('DeFi Market Intelligence Report');
    expect(t('sectionExchangeFlows', 'en')).toBe('Exchange Fund Flows');
    expect(t('disclaimer', 'en')).toContain('informational purposes');
  });

  it('returns Chinese translations', () => {
    expect(t('reportTitle', 'zh')).toBe('DeFi 市场情报日报');
    expect(t('sectionExchangeFlows', 'zh')).toBe('交易所资金流向');
    expect(t('disclaimer', 'zh')).toContain('仅供参考');
  });

  it('returns different values for different locales', () => {
    const keys: Array<Parameters<typeof t>[0]> = [
      'reportTitle',
      'sectionStablecoin',
      'sectionWhale',
      'sectionSuggestions',
      'bullish',
      'bearish',
    ];
    for (const key of keys) {
      expect(t(key, 'en')).not.toBe(t(key, 'zh'));
    }
  });

  it('covers signal labels', () => {
    expect(t('bullish', 'en')).toBe('BULLISH');
    expect(t('bullish', 'zh')).toBe('看涨');
    expect(t('bearish', 'en')).toBe('BEARISH');
    expect(t('bearish', 'zh')).toBe('看跌');
    expect(t('neutral', 'en')).toBe('NEUTRAL');
    expect(t('neutral', 'zh')).toBe('中性');
  });

  it('covers severity labels', () => {
    expect(t('info', 'en')).toBe('INFO');
    expect(t('notable', 'en')).toBe('NOTABLE');
    expect(t('significant', 'en')).toBe('SIGNIFICANT');
    expect(t('info', 'zh')).toBe('信息');
    expect(t('notable', 'zh')).toBe('关注');
    expect(t('significant', 'zh')).toBe('重要');
  });

  it('covers suggestion texts', () => {
    const suggKeys: Array<Parameters<typeof t>[0]> = [
      'suggCexInflow',
      'suggCexOutflow',
      'suggStableInflow',
      'suggStableOutflow',
      'suggWhaleAlert',
      'suggAllCalm',
    ];
    for (const key of suggKeys) {
      expect(t(key, 'en').length).toBeGreaterThan(0);
      expect(t(key, 'zh').length).toBeGreaterThan(0);
      expect(t(key, 'en')).not.toBe(t(key, 'zh'));
    }
  });
});
