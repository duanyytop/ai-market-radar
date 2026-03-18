# AI 市场雷达

[English README](./README.md)

AI 驱动的每日跨市场情报报告，覆盖**美股、港股、A 股和加密货币/DeFi**。

从免费公开 API 采集数据，通过 LLM 生成中英文双语分析报告，重点做跨市场联动分析。

**[查看最新报告 →](https://duanyytop.github.io/ai-market-radar/zh/)** | **[报告归档 →](https://duanyytop.github.io/ai-market-radar/zh/archive)**

报告每天**北京时间 8:00** 自动发布到 [GitHub Pages](https://duanyytop.github.io/ai-market-radar/zh/) 和 [GitHub Issues](https://github.com/duanyytop/ai-market-radar/issues?q=label%3Adaily-report)。

## 工作原理

```
新浪财经 ──→ 美股/港股/A股指数  ─┐                    ┌─→ GitHub Issues（中英文各一个）
东方财富 ──→ 北向资金/板块资金流  ├─→ LLM 分析 ────────┤
DeFiLlama ─→ 协议TVL/DEX交易量  │  （中英文双语）     └─→ GitHub Pages（带归档）
CoinGecko ─→ BTC/ETH/总市值     ┘
```

**跨市场分析框架：**
- **风险偏好传导链** — 美股定基调 → 港股跟隔夜 → A 股开盘反应 → 加密货币放大
- **资金轮动信号** — 稳定币供应 vs 股市资金流、北向 vs 南向、DeFi TVL 变化
- **背离告警** — 市场走势分化 = 最高 alpha 信号
- **宏观联动** — 美元走势、美联储政策、中国刺激政策的传导路径

## 报告内容

| 板块 | 覆盖范围 |
|------|----------|
| **核心洞察** | 今日最重要的跨市场信号 |
| **全球风险情绪** | 美股 → 港股 → A 股 → 加密货币传导 |
| **加密货币 & DeFi** | BTC/ETH、TVL 趋势、稳定币供应、DEX 交易量 |
| **美股市场** | 道琼斯、纳斯达克、标普 500 |
| **港股市场** | 恒生指数、国企指数、恒生科技 |
| **A 股市场** | 上证/深证/创业板、北向资金、板块轮动、涨跌家数 |
| **跨市场背离** | 哪些市场走势分化——以及原因 |
| **资金流向图** | 资金在四个市场之间如何流动 |
| **风险矩阵** | 按概率和影响排序的主要风险 |
| **行动建议** | 按风格分：保守型 / 稳健型 / 激进型 |

## 数据来源

| 来源 | 数据 | 费用 |
|------|------|------|
| [新浪财经](https://finance.sina.com.cn) | 美股、港股、A 股指数行情 | 免费 |
| [东方财富](https://data.eastmoney.com) | 北向资金、板块资金流、涨跌家数 | 免费 |
| [DeFiLlama](https://defillama.com) | 协议 TVL、稳定币供应、DEX 交易量 | 免费 |
| [CoinGecko](https://www.coingecko.com) | BTC/ETH 价格、总市值 | 免费 |

## 快速开始

1. Fork 或 clone 本仓库
2. 创建 `daily-report` 标签：`gh label create daily-report`
3. 开启 GitHub Pages：`Settings → Pages → Deploy from a branch → main → /docs`
4. 在仓库 Secrets 中配置 LLM（`Settings → Secrets → Actions`）：

### Kimi Code Plan（推荐，最便宜）

| Secret | 值 |
|--------|---|
| `ANTHROPIC_API_KEY` | 你的 Kimi Code 密钥 |
| `ANTHROPIC_BASE_URL` | `https://api.kimi.com/coding/` |

### Claude

| Secret | 值 |
|--------|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

### OpenAI 兼容

| Secret | 值 |
|--------|---|
| `LLM_PROVIDER` | `openai` |
| `LLM_API_KEY` | 你的 API 密钥 |
| `LLM_MODEL` | 模型名称 |
| `LLM_BASE_URL` | API 地址 |

5. 手动触发：`Actions → AI Market Radar → Run workflow`

> 未配置 LLM 密钥时，报告会降级为基于规则的分析，数据不受影响。

## 开发

```bash
git clone https://github.com/duanyytop/ai-market-radar.git
cd ai-market-radar
pnpm install
pnpm build        # 编译 TypeScript
pnpm typecheck    # 类型检查
pnpm test         # 运行测试
pnpm dev          # 本地生成报告
```

## License

MIT
