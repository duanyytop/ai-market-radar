import type {
  DefiRadarConfig,
  ReportData,
  MarketSignal,
  USMarketData,
  HKMarketData,
} from '../types.js';
import { getMarketOverview } from '../data/coingecko.js';
import { getProtocolTvls, getStablecoinSupply, getDexVolumes } from '../data/defillama.js';
import { getAllIndices } from '../data/sina.js';
import { analyzeWithLLM } from '../data/llm.js';
import { type Locale, t } from './i18n.js';

export async function generateDailyReport(
  config: DefiRadarConfig,
  locale: Locale = 'en',
): Promise<string> {
  const data = await collectReportData(config);
  data.signals = deriveSignals(data);
  return generateFromData(config, data, locale);
}

/**
 * Generate bilingual report (EN + ZH) from a single data fetch.
 * Data is collected once, then LLM is called twice with different locales.
 */
export async function generateBilingualReport(
  config: DefiRadarConfig,
): Promise<{ en: string; zh: string }> {
  const data = await collectReportData(config);
  data.signals = deriveSignals(data);

  const [en, zh] = await Promise.all([
    generateFromData(config, data, 'en'),
    generateFromData(config, data, 'zh'),
  ]);

  return { en, zh };
}

async function generateFromData(
  config: DefiRadarConfig,
  data: ReportData,
  locale: Locale,
): Promise<string> {
  const llmConfig = config.llm;
  if (llmConfig?.apiKey) {
    try {
      const provider = llmConfig.provider ?? 'anthropic';
      const model = llmConfig.model ?? 'claude-sonnet-4-5-20250514';
      console.error(`[llm] Generating ${locale} report with ${provider}/${model}...`);
      const llmReport = await analyzeWithLLM(
        data,
        {
          provider,
          apiKey: llmConfig.apiKey,
          model,
          baseURL: llmConfig.baseURL,
        },
        locale,
      );
      if (llmReport.length > 0) {
        console.error(`[llm] ${locale} report generated (${llmReport.length} chars)`);
        return llmReport;
      }
    } catch (err) {
      console.error(
        `[llm] ${locale} failed, falling back to rule-based: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return formatReport(locale, data);
}

async function collectReportData(config: DefiRadarConfig): Promise<ReportData> {
  const apiKey = config.coingecko?.apiKey;

  const [market, tvl, stablecoins, dexVolumes, stockData] = await Promise.all([
    getMarketOverview(apiKey).catch((err) => {
      console.error(`[market] failed: ${err instanceof Error ? err.message : String(err)}`);
      return {
        btcPrice: 0,
        btcChange24h: 0,
        ethPrice: 0,
        ethChange24h: 0,
        totalMarketCap: 0,
        marketCapChange24h: 0,
        totalVolume24h: 0,
      };
    }),
    getProtocolTvls(10).catch((err) => {
      console.error(`[tvl] failed: ${err instanceof Error ? err.message : String(err)}`);
      return { gainers: [], losers: [] };
    }),
    getStablecoinSupply().catch((err) => {
      console.error(`[stablecoins] failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }),
    getDexVolumes(10).catch((err) => {
      console.error(`[dex] failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }),
    collectStockData(config),
  ]);

  return {
    market,
    topTvlGainers: tvl.gainers,
    topTvlLosers: tvl.losers,
    stablecoins,
    dexVolumes,
    us: stockData.us,
    hk: stockData.hk,
    signals: [],
  };
}

async function collectStockData(
  _config: DefiRadarConfig,
): Promise<{ us: USMarketData | null; hk: HKMarketData | null }> {
  const allIndices = await getAllIndices().catch((err) => {
    console.error(`[sina] failed: ${err instanceof Error ? err.message : String(err)}`);
    return { us: [], hk: [] };
  });

  console.error(`[sina] US: ${allIndices.us.length}, HK: ${allIndices.hk.length}`);

  const us: USMarketData | null =
    allIndices.us.length > 0
      ? {
          indices: allIndices.us.map((i) => ({
            name: i.name,
            price: i.price,
            changePct: i.changePct,
          })),
        }
      : null;

  const hk: HKMarketData | null =
    allIndices.hk.length > 0
      ? {
          indices: allIndices.hk.map((i) => ({
            name: i.name,
            price: i.price,
            changePct: i.changePct,
          })),
        }
      : null;

  return { us, hk };
}

function deriveSignals(data: ReportData): MarketSignal[] {
  const signals: MarketSignal[] = [];

  // Price signals
  if (data.market.btcChange24h < -5 || data.market.ethChange24h < -5) {
    signals.push({
      type: 'price',
      severity: data.market.btcChange24h < -10 ? 'significant' : 'notable',
      signal: 'bearish',
      message: `BTC ${data.market.btcChange24h.toFixed(1)}%, ETH ${data.market.ethChange24h.toFixed(1)}% in 24h`,
    });
  } else if (data.market.btcChange24h > 5 || data.market.ethChange24h > 5) {
    signals.push({
      type: 'price',
      severity: data.market.btcChange24h > 10 ? 'significant' : 'notable',
      signal: 'bullish',
      message: `BTC +${data.market.btcChange24h.toFixed(1)}%, ETH +${data.market.ethChange24h.toFixed(1)}% in 24h`,
    });
  }

  // TVL signals
  const avgTvlChange =
    data.topTvlGainers.length > 0
      ? (data.topTvlGainers.reduce((s, p) => s + p.tvlChange1d, 0) +
          data.topTvlLosers.reduce((s, p) => s + p.tvlChange1d, 0)) /
        (data.topTvlGainers.length + data.topTvlLosers.length)
      : 0;

  if (avgTvlChange < -3) {
    signals.push({
      type: 'tvl',
      severity: avgTvlChange < -10 ? 'significant' : 'notable',
      signal: 'bearish',
      message: `Average protocol TVL change: ${avgTvlChange.toFixed(1)}%`,
    });
  } else if (avgTvlChange > 3) {
    signals.push({
      type: 'tvl',
      severity: avgTvlChange > 10 ? 'significant' : 'notable',
      signal: 'bullish',
      message: `Average protocol TVL change: +${avgTvlChange.toFixed(1)}%`,
    });
  }

  // Stablecoin supply signals
  const totalSupplyChange = data.stablecoins.reduce((s, c) => s + c.supplyChange1d, 0);
  if (Math.abs(totalSupplyChange) > 0.5) {
    signals.push({
      type: 'stablecoin',
      severity: Math.abs(totalSupplyChange) > 2 ? 'significant' : 'notable',
      signal: totalSupplyChange > 0 ? 'bullish' : 'bearish',
      message: `Stablecoin supply ${totalSupplyChange > 0 ? '+' : ''}${totalSupplyChange.toFixed(2)}% (1d)`,
    });
  }

  // DEX volume signals
  const topDex = data.dexVolumes[0];
  if (topDex && topDex.volumeChange1d > 50) {
    signals.push({
      type: 'dex_volume',
      severity: topDex.volumeChange1d > 100 ? 'significant' : 'notable',
      signal: 'neutral',
      message: `${topDex.name} volume +${topDex.volumeChange1d.toFixed(0)}% in 24h`,
    });
  }

  // US market signals
  if (data.us) {
    const sp500 = data.us.indices.find((i) => i.name === '标普500');
    if (sp500) {
      if (sp500.changePct < -2) {
        signals.push({
          type: 'us',
          severity: sp500.changePct < -3 ? 'significant' : 'notable',
          signal: 'bearish',
          message: `S&P 500 ${sp500.changePct.toFixed(2)}%`,
        });
      } else if (sp500.changePct > 2) {
        signals.push({
          type: 'us',
          severity: sp500.changePct > 3 ? 'significant' : 'notable',
          signal: 'bullish',
          message: `S&P 500 +${sp500.changePct.toFixed(2)}%`,
        });
      }
    }
  }

  // HK market signals
  if (data.hk) {
    const hsi = data.hk.indices.find((i) => i.name === '恒生指数');
    if (hsi) {
      if (hsi.changePct < -2) {
        signals.push({
          type: 'hk',
          severity: hsi.changePct < -3 ? 'significant' : 'notable',
          signal: 'bearish',
          message: `Hang Seng ${hsi.changePct.toFixed(2)}%`,
        });
      } else if (hsi.changePct > 2) {
        signals.push({
          type: 'hk',
          severity: hsi.changePct > 3 ? 'significant' : 'notable',
          signal: 'bullish',
          message: `Hang Seng +${hsi.changePct.toFixed(2)}%`,
        });
      }
    }
  }

  return signals;
}

function formatReport(locale: Locale, data: ReportData): string {
  const lines: string[] = [];
  const date = new Date().toISOString().split('T')[0];

  // Header
  lines.push(`# ${t('reportTitle', locale)} — ${date}`);
  lines.push('');
  lines.push(`**${t('generatedAt', locale)}:** ${new Date().toISOString()}`);
  lines.push('');

  // Market Overview
  lines.push(`## ${t('sectionMarketOverview', locale)}`);
  lines.push('');
  lines.push(`| | Price | ${t('change24h', locale)} |`);
  lines.push('|---|---:|---:|');
  lines.push(
    `| BTC | $${formatNum(data.market.btcPrice)} | ${formatPct(data.market.btcChange24h)} |`,
  );
  lines.push(
    `| ETH | $${formatNum(data.market.ethPrice)} | ${formatPct(data.market.ethChange24h)} |`,
  );
  lines.push('');
  lines.push(
    `**${t('totalMarketCap', locale)}:** $${formatBig(data.market.totalMarketCap)} (${formatPct(data.market.marketCapChange24h)})`,
  );
  lines.push(`**${t('totalVolume', locale)}:** $${formatBig(data.market.totalVolume24h)}`);
  lines.push('');

  // Protocol TVL
  lines.push(`## ${t('sectionTvlRankings', locale)}`);
  lines.push('');
  if (data.topTvlGainers.length === 0 && data.topTvlLosers.length === 0) {
    lines.push(t('noTvlData', locale));
  } else {
    if (data.topTvlGainers.length > 0) {
      lines.push(`### ${t('tvlGainers', locale)}`);
      lines.push('');
      lines.push(`| Protocol | TVL | 1d | 7d | Category |`);
      lines.push('|---|---:|---:|---:|---|');
      for (const p of data.topTvlGainers) {
        lines.push(
          `| ${p.name} | $${formatBig(p.tvl)} | ${formatPct(p.tvlChange1d)} | ${formatPct(p.tvlChange7d)} | ${p.category} |`,
        );
      }
      lines.push('');
    }
    if (data.topTvlLosers.length > 0) {
      lines.push(`### ${t('tvlLosers', locale)}`);
      lines.push('');
      lines.push(`| Protocol | TVL | 1d | 7d | Category |`);
      lines.push('|---|---:|---:|---:|---|');
      for (const p of data.topTvlLosers) {
        lines.push(
          `| ${p.name} | $${formatBig(p.tvl)} | ${formatPct(p.tvlChange1d)} | ${formatPct(p.tvlChange7d)} | ${p.category} |`,
        );
      }
      lines.push('');
    }
  }

  // Stablecoin Supply
  lines.push(`## ${t('sectionStablecoinSupply', locale)}`);
  lines.push('');
  if (data.stablecoins.length === 0) {
    lines.push(t('noStablecoinData', locale));
  } else {
    lines.push(
      `| Stablecoin | Supply | ${t('supplyChange1d', locale)} | ${t('supplyChange7d', locale)} |`,
    );
    lines.push('|---|---:|---:|---:|');
    for (const s of data.stablecoins) {
      lines.push(
        `| ${s.symbol} (${s.name}) | $${formatBig(s.totalSupply)} | ${formatPct(s.supplyChange1d)} | ${formatPct(s.supplyChange7d)} |`,
      );
    }
    lines.push('');
  }

  // DEX Volume
  lines.push(`## ${t('sectionDexVolume', locale)}`);
  lines.push('');
  if (data.dexVolumes.length === 0) {
    lines.push(t('noDexData', locale));
  } else {
    lines.push(`| DEX | 24h Volume | ${t('change24h', locale)} |`);
    lines.push('|---|---:|---:|');
    for (const d of data.dexVolumes) {
      lines.push(`| ${d.name} | $${formatBig(d.volume24h)} | ${formatPct(d.volumeChange1d)} |`);
    }
    lines.push('');
  }

  // US Market
  if (data.us && data.us.indices.length > 0) {
    lines.push(`## ${t('sectionUS', locale)}`);
    lines.push('');
    lines.push(
      `| ${t('stockIndex', locale)} | ${t('stockPrice', locale)} | ${t('change24h', locale)} |`,
    );
    lines.push('|---|---:|---:|');
    for (const idx of data.us.indices) {
      lines.push(`| ${idx.name} | ${formatNum(idx.price)} | ${formatPct(idx.changePct)} |`);
    }
    lines.push('');
  }

  // HK Market
  if (data.hk && data.hk.indices.length > 0) {
    lines.push(`## ${t('sectionHK', locale)}`);
    lines.push('');
    lines.push(
      `| ${t('stockIndex', locale)} | ${t('stockPrice', locale)} | ${t('change24h', locale)} |`,
    );
    lines.push('|---|---:|---:|');
    for (const idx of data.hk.indices) {
      lines.push(`| ${idx.name} | ${formatNum(idx.price)} | ${formatPct(idx.changePct)} |`);
    }
    lines.push('');
  }

  // Market Signals
  lines.push(`## ${t('sectionMarketSignals', locale)}`);
  lines.push('');
  if (data.signals.length === 0) {
    lines.push(t('suggAllCalm', locale));
  } else {
    for (const s of data.signals) {
      lines.push(`- [${t(s.severity, locale)}] [${t(s.signal, locale)}] ${s.message}`);
    }
  }
  lines.push('');

  // Suggestions
  lines.push(`## ${t('sectionSuggestions', locale)}`);
  lines.push('');
  const suggestions = deriveSuggestions(locale, data);
  for (const s of suggestions) {
    lines.push(`- ${s}`);
  }
  lines.push('');

  // Disclaimer
  lines.push('---');
  lines.push(`*${t('disclaimer', locale)}*`);

  return lines.join('\n');
}

function deriveSuggestions(locale: Locale, data: ReportData): string[] {
  const suggestions: string[] = [];

  if (data.market.btcChange24h < -5 || data.market.ethChange24h < -5) {
    suggestions.push(t('suggPriceDrop', locale));
  } else if (data.market.btcChange24h > 5 || data.market.ethChange24h > 5) {
    suggestions.push(t('suggPriceRise', locale));
  }

  const avgTvl =
    data.topTvlGainers.length > 0
      ? (data.topTvlGainers.reduce((s, p) => s + p.tvlChange1d, 0) +
          data.topTvlLosers.reduce((s, p) => s + p.tvlChange1d, 0)) /
        (data.topTvlGainers.length + data.topTvlLosers.length)
      : 0;
  if (avgTvl < -3) suggestions.push(t('suggTvlDrop', locale));
  else if (avgTvl > 3) suggestions.push(t('suggTvlRise', locale));

  const totalStableChange = data.stablecoins.reduce((s, c) => s + c.supplyChange1d, 0);
  if (totalStableChange > 0.5) suggestions.push(t('suggStableSupplyUp', locale));
  else if (totalStableChange < -0.5) suggestions.push(t('suggStableSupplyDown', locale));

  const topDex = data.dexVolumes[0];
  if (topDex && topDex.volumeChange1d > 50) suggestions.push(t('suggDexVolumeSpike', locale));

  if (suggestions.length === 0) suggestions.push(t('suggAllCalm', locale));

  return suggestions;
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatBig(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}
