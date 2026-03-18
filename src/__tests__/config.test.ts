import { describe, it, expect, afterEach } from 'vitest';
import { ConfigSchema } from '../types.js';
import { loadConfig } from '../config.js';

describe('ConfigSchema', () => {
  it('validates empty config', () => {
    const result = ConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts coingecko key', () => {
    const result = ConfigSchema.safeParse({ coingecko: { apiKey: 'test' } });
    expect(result.success).toBe(true);
  });

  it('accepts config without coingecko', () => {
    const result = ConfigSchema.parse({});
    expect(result.coingecko).toBeUndefined();
  });

  it('accepts llm config', () => {
    const result = ConfigSchema.safeParse({
      llm: { provider: 'openai', apiKey: 'test', baseURL: 'https://api.kimi.com/v1' },
    });
    expect(result.success).toBe(true);
  });

  it('applies default provider and model for llm', () => {
    const result = ConfigSchema.parse({ llm: {} });
    expect(result.llm?.provider).toBe('anthropic');
    expect(result.llm?.model).toBe('claude-sonnet-4-5-20250514');
  });
});

describe('loadConfig from env', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('picks up COINGECKO_API_KEY from env', () => {
    process.env = { ...originalEnv, COINGECKO_API_KEY: 'cg-test' };
    const config = loadConfig();
    expect(config.coingecko?.apiKey).toBe('cg-test');
  });

  it('returns empty config when no env or file', () => {
    process.env = { ...originalEnv };
    delete process.env.COINGECKO_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const config = loadConfig();
    expect(config).toBeDefined();
  });

  it('picks up LLM config from env', () => {
    process.env = {
      ...originalEnv,
      LLM_API_KEY: 'sk-test',
      LLM_PROVIDER: 'openai',
      LLM_MODEL: 'kimi-2.5',
      LLM_BASE_URL: 'https://api.kimi.com/v1',
    };
    const config = loadConfig();
    expect(config.llm?.apiKey).toBe('sk-test');
    expect(config.llm?.provider).toBe('openai');
    expect(config.llm?.model).toBe('kimi-2.5');
    expect(config.llm?.baseURL).toBe('https://api.kimi.com/v1');
  });

  it('falls back to ANTHROPIC_API_KEY env var', () => {
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'sk-ant-test' };
    const config = loadConfig();
    expect(config.llm?.apiKey).toBe('sk-ant-test');
    expect(config.llm?.provider).toBe('anthropic');
  });
});
