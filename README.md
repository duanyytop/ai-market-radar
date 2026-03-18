# DeFi Radar

AI-powered daily DeFi market intelligence report. Collects data from DeFiLlama + CoinGecko, then uses LLM to produce deep, actionable analysis for crypto investors.

Supports multiple LLM providers: Anthropic Claude, Kimi, OpenAI, or any OpenAI-compatible API.

Reports are automatically generated via GitHub Actions and posted as GitHub Issues at **8:00 AM Beijing time** daily.

## How It Works

```
DeFiLlama API ─┐
                ├─→ Structured Data ─→ LLM Analysis ─→ Market Intelligence Report
CoinGecko API ──┘
```

1. **Data collection** — Fetches protocol TVL, stablecoin supply, DEX volumes, and market prices from free APIs
2. **AI analysis** — LLM analyzes correlations, identifies signals, and generates actionable insights
3. **Report delivery** — Posted as a GitHub Issue with full Markdown formatting

> Without an LLM API key, falls back to a rule-based report with the same data.

## What's in the Report

| Section | What It Tells You |
|---------|-------------------|
| **Market Overview** | BTC/ETH prices, market cap trend, trading volume |
| **DeFi Protocol Analysis** | Where capital is flowing — TVL gainers and losers |
| **Stablecoin Dynamics** | New money entering or leaving the crypto market |
| **Trading Activity** | DEX volume spikes and what they signal |
| **Risk Assessment** | Key risks to watch |
| **Actionable Suggestions** | Recommendations by investor profile (conservative / moderate / aggressive) |

## Setup

### Automated (GitHub Actions)

1. Fork or clone this repo
2. Create a `daily-report` label: `gh label create daily-report`
3. Add LLM secrets to your repo (`Settings → Secrets → Actions`):

   | Secret | Required | Description |
   |--------|----------|-------------|
   | `LLM_API_KEY` | Recommended | API key for LLM provider |
   | `LLM_PROVIDER` | No | `anthropic` or `openai` (default: `anthropic`) |
   | `LLM_MODEL` | No | Model name (default: `claude-sonnet-4-5-20250514`) |
   | `LLM_BASE_URL` | No | Custom base URL (required for Kimi, OpenRouter, etc.) |
   | `COINGECKO_API_KEY` | No | CoinGecko API key for better rate limits |

4. The workflow runs daily. Trigger manually: `Actions → Daily DeFi Report → Run workflow`

#### Example: Kimi 2.5

```
LLM_PROVIDER=openai
LLM_API_KEY=your-kimi-api-key
LLM_MODEL=kimi-2.5
LLM_BASE_URL=https://api.kimi.com/v1
```

#### Example: Claude

```
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-5-20250514
```

### Local Usage

```bash
pnpm install
export LLM_API_KEY=your-key
export LLM_PROVIDER=openai
export LLM_MODEL=kimi-2.5
export LLM_BASE_URL=https://api.kimi.com/v1
pnpm report -- --stdout                 # Print to terminal
pnpm report -- --locale zh              # Chinese report
pnpm report                             # Save to ~/.defi-radar/reports/
```

## Configuration

Optional config file at `~/.defi-radar/config.json`:

```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "your-kimi-key",
    "model": "kimi-2.5",
    "baseURL": "https://api.kimi.com/v1"
  },
  "coingecko": {
    "apiKey": "YOUR_OPTIONAL_KEY"
  }
}
```

Or use environment variables (take precedence over config file):

| Variable | Description |
|----------|-------------|
| `LLM_API_KEY` | LLM API key (also reads `ANTHROPIC_API_KEY` as fallback) |
| `LLM_PROVIDER` | `anthropic` or `openai` (default: `anthropic`) |
| `LLM_MODEL` | Model name |
| `LLM_BASE_URL` | Custom API base URL |
| `COINGECKO_API_KEY` | CoinGecko API key |

## Development

```bash
git clone https://github.com/duanyytop/defi-radar.git
cd defi-radar
pnpm install
pnpm build        # Compile TypeScript
pnpm typecheck    # Type check
pnpm test         # Run tests
pnpm report       # Generate report locally
```

## License

MIT
