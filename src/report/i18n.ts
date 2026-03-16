export type Locale = 'en' | 'zh';

const translations = {
  reportTitle: {
    en: 'DeFi Market Intelligence Report',
    zh: 'DeFi 市场情报日报',
  },
  generatedAt: {
    en: 'Generated at',
    zh: '生成时间',
  },
  chains: {
    en: 'Monitored Chains',
    zh: '监控链',
  },

  // Sections
  sectionExchangeFlows: {
    en: 'Exchange Fund Flows',
    zh: '交易所资金流向',
  },
  sectionStablecoin: {
    en: 'Stablecoin Flows',
    zh: '稳定币流向',
  },
  sectionWhale: {
    en: 'Whale Movements',
    zh: '巨鲸动向',
  },
  sectionMarketSignals: {
    en: 'Market Signals',
    zh: '市场信号',
  },
  sectionSuggestions: {
    en: 'Investment Considerations',
    zh: '投资参考建议',
  },

  // Exchange flows
  cexFlows: {
    en: 'CEX Flows',
    zh: 'CEX 资金流',
  },
  dexFlows: {
    en: 'DEX Flows',
    zh: 'DEX 资金流',
  },
  totalInflow: {
    en: 'Total Inflow',
    zh: '总流入',
  },
  totalOutflow: {
    en: 'Total Outflow',
    zh: '总流出',
  },
  netInflow: {
    en: 'Net Inflow',
    zh: '净流入',
  },
  netOutflow: {
    en: 'Net Outflow',
    zh: '净流出',
  },
  noExchangeData: {
    en: 'No exchange flow data available.',
    zh: '暂无交易所资金流数据。',
  },

  // Stablecoin
  stablecoinBullish: {
    en: 'Stablecoins flowing into exchanges — potential buying demand',
    zh: '稳定币流入交易所——潜在买入需求',
  },
  stablecoinBearish: {
    en: 'Stablecoins flowing out of exchanges — reduced trading interest',
    zh: '稳定币流出交易所——交易意愿降低',
  },
  stablecoinNeutral: {
    en: 'Stablecoin flows neutral — no clear directional signal',
    zh: '稳定币流向中性——无明显方向信号',
  },
  noStablecoinData: {
    en: 'No stablecoin flow data available.',
    zh: '暂无稳定币流向数据。',
  },

  // Whale
  whaleToExchange: {
    en: 'Whale deposit to exchange (potential sell pressure)',
    zh: '巨鲸向交易所充值（潜在抛压）',
  },
  whaleFromExchange: {
    en: 'Whale withdrawal from exchange (accumulation signal)',
    zh: '巨鲸从交易所提现（囤币信号）',
  },
  whaleTransfer: {
    en: 'Large whale-to-whale transfer',
    zh: '巨鲸间大额转账',
  },
  noWhaleData: {
    en: 'No whale movements detected.',
    zh: '未检测到巨鲸异动。',
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
  suggCexInflow: {
    en: 'Significant CEX inflows detected — watch for potential sell-off',
    zh: 'CEX 出现明显资金流入——注意潜在抛压',
  },
  suggCexOutflow: {
    en: 'Net CEX outflows suggest accumulation — market participants withdrawing to self-custody',
    zh: 'CEX 净流出显示囤币趋势——市场参与者提现至自托管',
  },
  suggStableInflow: {
    en: 'Stablecoins moving to exchanges — dry powder being deployed, watch for upward price action',
    zh: '稳定币正流入交易所——资金蓄势待发，关注价格上行',
  },
  suggStableOutflow: {
    en: 'Stablecoins leaving exchanges — participants may be de-risking or moving to DeFi yields',
    zh: '稳定币正流出交易所——参与者可能在降低风险或转向 DeFi 收益',
  },
  suggWhaleAlert: {
    en: 'Large whale movements detected — monitor for market impact over next 24-48 hours',
    zh: '检测到巨鲸大额异动——关注未来 24-48 小时市场影响',
  },
  suggAllCalm: {
    en: 'On-chain activity is calm — no significant fund movements detected',
    zh: '链上活动平静——未检测到显著资金异动',
  },

  // Footer
  disclaimer: {
    en: 'This report is for informational purposes only and does not constitute financial advice. Always do your own research.',
    zh: '本报告仅供参考，不构成任何投资建议。请务必自行研究判断。',
  },
} as const;

type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  return translations[key][locale];
}
