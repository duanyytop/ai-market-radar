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

#### Example: Kimi Code Plan (recommended)

```
ANTHROPIC_API_KEY=your-kimi-code-key
ANTHROPIC_BASE_URL=https://api.kimi.com/coding/
```

Uses Anthropic-compatible API, no extra config needed.

#### Example: Claude

```
ANTHROPIC_API_KEY=sk-ant-...
```

#### Example: OpenAI-compatible (Kimi 2.5 direct, OpenRouter, etc.)

```
LLM_PROVIDER=openai
LLM_API_KEY=your-api-key
LLM_MODEL=kimi-2.5
LLM_BASE_URL=https://api.kimi.com/v1
```

### Local Usage

```bash
pnpm install
export ANTHROPIC_API_KEY=your-kimi-code-key
export ANTHROPIC_BASE_URL=https://api.kimi.com/coding/
pnpm report -- --stdout                 # Print to terminal
pnpm report -- --locale zh              # Chinese report
pnpm report                             # Save to ~/.defi-radar/reports/
```

## Configuration

Optional config file at `~/.defi-radar/config.json`:

```json
{
  "llm": {
    "provider": "anthropic",
    "apiKey": "your-kimi-code-key",
    "baseURL": "https://api.kimi.com/coding/"
  },
  "coingecko": {
    "apiKey": "YOUR_OPTIONAL_KEY"
  }
}
```

Or use environment variables (take precedence over config file):

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic/Kimi Code API key |
| `ANTHROPIC_BASE_URL` | Base URL override (e.g. `https://api.kimi.com/coding/` for Kimi Code Plan) |
| `LLM_API_KEY` | Alternative to ANTHROPIC_API_KEY (takes precedence) |
| `LLM_PROVIDER` | `anthropic` or `openai` (default: `anthropic`) |
| `LLM_MODEL` | Model name override |
| `LLM_BASE_URL` | Alternative to ANTHROPIC_BASE_URL (takes precedence) |
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
