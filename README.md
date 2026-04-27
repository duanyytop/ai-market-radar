# AI Market Radar

[中文版 README](./README_ZH.md)

AI-powered daily cross-market intelligence report covering **US stocks, Hong Kong stocks, China A-shares, and Crypto/DeFi**.

Collects data from free public APIs, then uses LLM to produce bilingual (EN/ZH) analysis with cross-market correlation insights.

**[View Latest Report →](https://duanyytop.github.io/ai-market-radar/)** | **[查看最新报告 →](https://duanyytop.github.io/ai-market-radar/zh/)**

Reports are published daily at **8:00 AM Beijing time** to [GitHub Pages](https://duanyytop.github.io/ai-market-radar/) and [GitHub Issues](https://github.com/duanyytop/ai-market-radar/issues?q=label%3Adaily-report).

## How It Works

```
Sina Finance ──→ US / HK / A-share indices  ─┐                    ┌─→ GitHub Issues
Eastmoney ─────→ Northbound flow, sectors    ├─→ LLM Analysis ───┤
DeFiLlama ─────→ Protocol TVL, DEX volume    │   (EN + ZH)       └─→ GitHub Pages
CoinGecko ─────→ BTC/ETH, market cap         ┘
```

**Cross-market analysis framework:**
- **Risk Appetite Chain** — US sets tone → HK follows overnight → A-shares react → Crypto amplifies
- **Capital Rotation** — Stablecoin supply vs stock flows, northbound vs southbound, DeFi TVL shifts
- **Divergence Alerts** — Markets moving in opposite directions = highest-alpha signals
- **Macro Linkages** — USD strength, Fed policy, China stimulus transmission

## What's in the Report

| Section | Coverage |
|---------|----------|
| **Key Insight** | The single most important cross-market signal today |
| **Global Risk Sentiment** | US → HK → A-share → Crypto transmission |
| **Crypto & DeFi** | BTC/ETH, TVL trends, stablecoin supply, DEX volume |
| **US Market** | Dow Jones, NASDAQ, S&P 500 |
| **Hong Kong Market** | Hang Seng, HS China Enterprise, HS TECH |
| **A-Share Market** | SSE/SZSE/ChiNext, northbound flow, sector rotation, breadth |
| **Cross-Market Divergences** | Where markets disagree — and why |
| **Capital Flow Map** | Where money is moving across all four markets |
| **Risk Matrix** | Top risks ranked by probability and impact |
| **Action Plan** | Recommendations by profile: conservative / moderate / aggressive |

## Data Sources

| Source | Data | Cost |
|--------|------|------|
| [Sina Finance](https://finance.sina.com.cn) | US, HK, A-share index quotes | Free, no key |
| [Eastmoney](https://data.eastmoney.com) | Northbound flow, sector flows, market breadth | Free, no key |
| [DeFiLlama](https://defillama.com) | Protocol TVL, stablecoin supply, DEX volumes | Free, no key |
| [CoinGecko](https://www.coingecko.com) | BTC/ETH prices, market cap | Free, key optional |

## Setup

1. Fork or clone this repo
2. Create a `daily-report` label: `gh label create daily-report`
3. Enable GitHub Pages: `Settings → Pages → Deploy from a branch → main → /docs`
4. Add LLM secrets to your repo (`Settings → Secrets → Actions`):

### Kimi Code Plan (recommended — cheapest)

| Secret | Value |
|--------|-------|
| `ANTHROPIC_API_KEY` | Your Kimi Code key |
| `ANTHROPIC_BASE_URL` | `https://api.kimi.com/coding/` |

### Claude

| Secret | Value |
|--------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

### OpenAI-compatible

| Secret | Value |
|--------|-------|
| `LLM_PROVIDER` | `openai` |
| `LLM_API_KEY` | Your API key |
| `LLM_MODEL` | Model name |
| `LLM_BASE_URL` | API endpoint |

5. Trigger manually: `Actions → AI Market Radar → Run workflow`

> Without an LLM API key, reports fall back to rule-based analysis with the same data.

## Development

```bash
git clone https://github.com/duanyytop/ai-market-radar.git
cd ai-market-radar
pnpm install
pnpm build        # Compile TypeScript
pnpm typecheck    # Type check
pnpm test         # Run tests
pnpm dev          # Generate report locally
```

## License

MIT

## 💰 Bounty Contribution

- **Task:** AI Market Radar — 2026-04-27
- **Reward:** $78471
- **Source:** GitHub-Paid
- **Date:** 2026-04-27

