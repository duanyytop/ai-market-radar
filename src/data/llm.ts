import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { ReportData } from '../types.js';

const SYSTEM_PROMPT = `You are a senior cross-market analyst writing a daily intelligence report for investors who allocate capital across US stocks, Hong Kong stocks, and crypto/DeFi. Your core value is connecting the dots across these three markets.

Analysis Framework — use these specific lenses for cross-market analysis:

1. **Risk Appetite Chain**: US equities set the global tone → HK follows US overnight → Crypto amplifies (higher beta). Trace this transmission chain in the data.

2. **Capital Rotation Signals**:
   - Stablecoin supply ↑ + stock markets flat/down = capital rotating into crypto
   - DeFi TVL ↑ + stablecoin supply flat = existing crypto capital moving on-chain
   - US tech up + HSTECH up = global tech rally, check if crypto follows

3. **Divergence Alerts** (most valuable signals):
   - US up but crypto down = crypto-specific headwind (regulatory? liquidation?)
   - BTC up but DeFi TVL down = speculative momentum, not fundamental
   - Both stock markets down but stablecoins increasing = smart money preparing to buy dips

4. **Macro Linkages**:
   - USD strength → typically bearish for crypto and HK
   - US Fed hawkish → bearish everything, watch for correlation spike

Guidelines:
- Base every claim on the provided data. Do not fabricate numbers.
- Lead with the most important cross-market insight, not a generic summary.
- When markets diverge, explain WHY — that's where the alpha is.
- Provide specific, actionable suggestions — not generic advice.
- Use bullet points and tables for readability.
- Be concise. Investors are busy.
- Stock market data reflects the previous trading day's close.
- Write in the language specified by the user.`;

function buildUserPrompt(data: ReportData, locale: string): string {
  const dataContext = buildDataContext(data);
  const date = new Date().toISOString().split('T')[0];
  const lang = locale === 'zh' ? 'Chinese (简体中文)' : 'English';

  return `Here is today's (${date}) market data across crypto, US, and HK markets:

${dataContext}

Write a cross-market intelligence report in **${lang}**. Structure:

1. **Key Insight** — Lead with the single most important cross-market signal today (1-2 sentences)
2. **Global Risk Sentiment** — US → HK transmission chain. Is risk on or off? Are markets aligned or diverging?
3. **Crypto & DeFi** — BTC/ETH action, TVL trends, stablecoin supply shifts. How does crypto relate to equity markets today?
4. **US Market** — Index performance, what it means for global capital flows
5. **Hong Kong Market** — HSI/HSCEI/HSTECH, China exposure sentiment
6. **Cross-Market Divergences** — Any markets moving in opposite directions? Explain why and what it implies
7. **Capital Flow Map** — Where is money moving? (stablecoin supply changes, DeFi TVL — connect the dots)
8. **Risk Matrix** — Top 3 risks across all markets, ranked by probability and impact
9. **Action Plan** — Specific recommendations for: conservative (preserve capital), moderate (selective positioning), aggressive (high-conviction plays)

Format in Markdown with title: "# Market Intelligence Report — ${date}"

End with a disclaimer that this is AI-generated analysis for reference only, not financial advice.`;
}

function buildDataContext(data: ReportData): string {
  const lines: string[] = [];

  lines.push('## Raw Market Data');
  lines.push('');
  lines.push('### Prices & Market Cap');
  lines.push(
    `- BTC: $${data.market.btcPrice.toLocaleString()} (${data.market.btcChange24h >= 0 ? '+' : ''}${data.market.btcChange24h.toFixed(2)}% 24h)`,
  );
  lines.push(
    `- ETH: $${data.market.ethPrice.toLocaleString()} (${data.market.ethChange24h >= 0 ? '+' : ''}${data.market.ethChange24h.toFixed(2)}% 24h)`,
  );
  lines.push(
    `- Total Market Cap: $${(data.market.totalMarketCap / 1e9).toFixed(1)}B (${data.market.marketCapChange24h >= 0 ? '+' : ''}${data.market.marketCapChange24h.toFixed(2)}% 24h)`,
  );
  lines.push(`- Total 24h Volume: $${(data.market.totalVolume24h / 1e9).toFixed(1)}B`);
  lines.push('');

  if (data.topTvlGainers.length > 0) {
    lines.push('### Protocol TVL — Top Gainers (24h)');
    for (const p of data.topTvlGainers) {
      lines.push(
        `- ${p.name} (${p.category}): $${(p.tvl / 1e9).toFixed(2)}B TVL, ${p.tvlChange1d >= 0 ? '+' : ''}${p.tvlChange1d.toFixed(2)}% 1d, ${p.tvlChange7d >= 0 ? '+' : ''}${p.tvlChange7d.toFixed(2)}% 7d`,
      );
    }
    lines.push('');
  }

  if (data.topTvlLosers.length > 0) {
    lines.push('### Protocol TVL — Top Losers (24h)');
    for (const p of data.topTvlLosers) {
      lines.push(
        `- ${p.name} (${p.category}): $${(p.tvl / 1e9).toFixed(2)}B TVL, ${p.tvlChange1d >= 0 ? '+' : ''}${p.tvlChange1d.toFixed(2)}% 1d, ${p.tvlChange7d >= 0 ? '+' : ''}${p.tvlChange7d.toFixed(2)}% 7d`,
      );
    }
    lines.push('');
  }

  if (data.stablecoins.length > 0) {
    lines.push('### Stablecoin Supply');
    for (const s of data.stablecoins) {
      lines.push(
        `- ${s.symbol} (${s.name}): $${(s.totalSupply / 1e9).toFixed(2)}B supply, ${s.supplyChange1d >= 0 ? '+' : ''}${s.supplyChange1d.toFixed(3)}% 1d, ${s.supplyChange7d >= 0 ? '+' : ''}${s.supplyChange7d.toFixed(3)}% 7d`,
      );
    }
    lines.push('');
  }

  if (data.dexVolumes.length > 0) {
    lines.push('### DEX Trading Volume (24h)');
    for (const d of data.dexVolumes) {
      lines.push(
        `- ${d.name}: $${(d.volume24h / 1e6).toFixed(1)}M (${d.volumeChange1d >= 0 ? '+' : ''}${d.volumeChange1d.toFixed(1)}% vs prev day)`,
      );
    }
    lines.push('');
  }

  // US Market data
  if (data.us && data.us.indices.length > 0) {
    lines.push('### US Market (Previous Close)');
    for (const idx of data.us.indices) {
      lines.push(
        `- ${idx.name}: ${idx.price.toFixed(2)} (${idx.changePct >= 0 ? '+' : ''}${idx.changePct.toFixed(2)}%)`,
      );
    }
    lines.push('');
  }

  // HK Market data
  if (data.hk && data.hk.indices.length > 0) {
    lines.push('### Hong Kong Market (Previous Close)');
    for (const idx of data.hk.indices) {
      lines.push(
        `- ${idx.name}: ${idx.price.toFixed(2)} (${idx.changePct >= 0 ? '+' : ''}${idx.changePct.toFixed(2)}%)`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Call Anthropic native API.
 */
async function callAnthropic(
  apiKey: string,
  baseURL: string | undefined,
  model: string,
  userPrompt: string,
): Promise<string> {
  const opts: ConstructorParameters<typeof Anthropic>[0] = { apiKey };
  if (baseURL) opts.baseURL = baseURL;

  const client = new Anthropic(opts);
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}

/**
 * Call OpenAI-compatible API (kimi, openai, openrouter, etc.)
 */
async function callOpenAICompatible(
  apiKey: string,
  baseURL: string,
  model: string,
  userPrompt: string,
): Promise<string> {
  const client = new OpenAI({ apiKey, baseURL });
  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content ?? '';
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model: string;
  baseURL?: string;
}

export async function analyzeWithLLM(
  data: ReportData,
  config: LLMConfig,
  locale: string,
): Promise<string> {
  const userPrompt = buildUserPrompt(data, locale);

  if (config.provider === 'openai') {
    if (!config.baseURL) throw new Error('baseURL is required for openai provider');
    return callOpenAICompatible(config.apiKey, config.baseURL, config.model, userPrompt);
  }

  return callAnthropic(config.apiKey, config.baseURL, config.model, userPrompt);
}
