export type Locale = 'en' | 'zh';

const translations = {
  reportTitle: {
    en: 'AI Market Radar — Daily Intelligence Report',
    zh: 'AI 市场雷达 — 每日情报',
  },
  generatedAt: {
    en: 'Generated at',
    zh: '生成时间',
  },

  // Sections
  sectionMarketOverview: {
    en: 'Market Overview',
    zh: '市场概览',
  },
  sectionTvlRankings: {
    en: 'Protocol TVL Changes',
    zh: '协议 TVL 变化',
  },
  sectionStablecoinSupply: {
    en: 'Stablecoin Supply',
    zh: '稳定币供应量',
  },
  sectionDexVolume: {
    en: 'DEX Trading Volume',
    zh: 'DEX 交易量',
  },
  sectionMarketSignals: {
    en: 'Market Signals',
    zh: '市场信号',
  },
  sectionSuggestions: {
    en: 'Investment Considerations',
    zh: '投资参考建议',
  },

  // Market overview
  totalMarketCap: {
    en: 'Total Market Cap',
    zh: '总市值',
  },
  totalVolume: {
    en: '24h Volume',
    zh: '24小时交易量',
  },
  change24h: {
    en: '24h Change',
    zh: '24小时涨跌',
  },

  // TVL
  tvlGainers: {
    en: 'Top Gainers (TVL 24h)',
    zh: 'TVL 涨幅榜 (24h)',
  },
  tvlLosers: {
    en: 'Top Losers (TVL 24h)',
    zh: 'TVL 跌幅榜 (24h)',
  },
  noTvlData: {
    en: 'No TVL data available.',
    zh: '暂无 TVL 数据。',
  },

  // US Market
  sectionUS: {
    en: 'US Market (Previous Close)',
    zh: '美股市场（上一交易日收盘）',
  },

  // HK Market
  sectionHK: {
    en: 'Hong Kong Market (Previous Close)',
    zh: '港股市场（上一交易日收盘）',
  },

  // Stock market shared keys
  stockIndex: {
    en: 'Index',
    zh: '指数',
  },
  stockPrice: {
    en: 'Close',
    zh: '收盘价',
  },

  // Stablecoin
  supplyChange1d: {
    en: '1d Change',
    zh: '日变化',
  },
  supplyChange7d: {
    en: '7d Change',
    zh: '周变化',
  },
  noStablecoinData: {
    en: 'No stablecoin data available.',
    zh: '暂无稳定币数据。',
  },

  // DEX
  noDexData: {
    en: 'No DEX volume data available.',
    zh: '暂无 DEX 交易量数据。',
  },

  // Signals
  bullish: {
    en: 'BULLISH',
    zh: '看涨',
  },
  bearish: {
    en: 'BEARISH',
    zh: '看跌',
  },
  neutral: {
    en: 'NEUTRAL',
    zh: '中性',
  },
  info: {
    en: 'INFO',
    zh: '信息',
  },
  notable: {
    en: 'NOTABLE',
    zh: '关注',
  },
  significant: {
    en: 'SIGNIFICANT',
    zh: '重要',
  },

  // Suggestions
  suggPriceDrop: {
    en: 'Significant price decline detected — exercise caution, consider waiting for stabilization',
    zh: '检测到价格大幅下跌——建议谨慎操作，等待企稳信号',
  },
  suggPriceRise: {
    en: 'Strong upward momentum — monitor for overheating signals and potential corrections',
    zh: '价格上行动能强劲——关注过热信号及潜在回调风险',
  },
  suggTvlDrop: {
    en: 'DeFi TVL declining — funds leaving protocols, risk-off sentiment',
    zh: 'DeFi TVL 下降——资金流出协议，避险情绪升温',
  },
  suggTvlRise: {
    en: 'DeFi TVL growing — capital flowing into protocols, confidence building',
    zh: 'DeFi TVL 增长——资金流入协议，市场信心增强',
  },
  suggStableSupplyUp: {
    en: 'Stablecoin supply increasing — new capital entering the crypto market',
    zh: '稳定币供应量增加——新资金正在进入加密市场',
  },
  suggStableSupplyDown: {
    en: 'Stablecoin supply contracting — capital may be exiting the crypto market',
    zh: '稳定币供应量收缩——资金可能正在撤出加密市场',
  },
  suggDexVolumeSpike: {
    en: 'DEX volume surging — high trading activity, watch for volatility',
    zh: 'DEX 交易量激增——交易活跃度高，注意波动风险',
  },
  suggAllCalm: {
    en: 'Market conditions stable — no significant signals detected',
    zh: '市场状况稳定——未检测到显著信号',
  },

  // Footer
  disclaimer: {
    en: 'This report is generated from DeFiLlama and CoinGecko public APIs. It is for informational purposes only and does not constitute financial advice. Always do your own research.',
    zh: '本报告数据来源于 DeFiLlama 和 CoinGecko 公开 API，仅供参考，不构成任何投资建议。请务必自行研究判断。',
  },
} as const;

type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  return translations[key][locale];
}
