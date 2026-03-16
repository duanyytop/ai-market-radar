import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ConfigSchema, type DefiRadarConfig } from './types.js';

const CONFIG_DIR = join(homedir(), '.defi-radar');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function loadConfig(): DefiRadarConfig {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error(
      `Config file not found at ${CONFIG_FILE}\n\n` +
        'Create it with:\n' +
        `  mkdir -p ${CONFIG_DIR}\n` +
        `  cat > ${CONFIG_FILE} << 'EOF'\n` +
        JSON.stringify(
          {
            chains: {
              ethereum: { rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY' },
              arbitrum: { rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY' },
              base: { rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY' },
            },
            monitoring: {
              tokens: ['USDC', 'USDT', 'WETH', 'WBTC', 'DAI'],
              chains: ['ethereum', 'arbitrum', 'base'],
              whaleThresholdUsd: 100000,
            },
          },
          null,
          2,
        ) +
        '\nEOF',
    );
  }

  const raw = readFileSync(CONFIG_FILE, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${CONFIG_FILE}`);
  }

  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid config in ${CONFIG_FILE}:\n${issues}`);
  }

  return result.data;
}
