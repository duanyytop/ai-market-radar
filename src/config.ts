import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ConfigSchema, type DefiRadarConfig } from './types.js';

const CONFIG_DIR = join(homedir(), '.defi-radar');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function getConfigPath(): string {
  return process.env.DEFI_RADAR_CONFIG ?? CONFIG_FILE;
}

export function loadConfig(): DefiRadarConfig {
  // Build from env vars + config file
  const envOverrides: Record<string, unknown> = {};

  if (process.env.COINGECKO_API_KEY) {
    envOverrides.coingecko = { apiKey: process.env.COINGECKO_API_KEY };
  }
  // LLM config from env vars
  const llmApiKey = process.env.LLM_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  const llmBaseURL = process.env.LLM_BASE_URL ?? process.env.ANTHROPIC_BASE_URL;
  if (llmApiKey) {
    envOverrides.llm = {
      provider: process.env.LLM_PROVIDER ?? 'anthropic',
      apiKey: llmApiKey,
      ...(process.env.LLM_MODEL && { model: process.env.LLM_MODEL }),
      ...(llmBaseURL && { baseURL: llmBaseURL }),
    };
  }

  const configPath = getConfigPath();
  let fileConfig: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, 'utf-8');
    try {
      fileConfig = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error(`Invalid JSON in ${configPath}`);
    }
  }

  // Env vars override file config
  const merged = { ...fileConfig, ...envOverrides };

  const result = ConfigSchema.safeParse(merged);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid config:\n${issues}`);
  }

  return result.data;
}
