export interface SinaIndexQuote {
  code: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number; // 手
  amount: number; // 万元
}

// Sina finance real-time index API
// Returns CSV-like format: var hq_str_s_sh000001="上证指数,3261.12,34.56,1.07,3890562,48765432";
const SINA_INDEX_CODES = ['s_sh000001', 's_sz399001', 's_sz399006'] as const;
const INDEX_NAMES: Record<string, { en: string; zh: string }> = {
  s_sh000001: { en: 'SSE Composite', zh: '上证指数' },
  s_sz399001: { en: 'SZSE Component', zh: '深证成指' },
  s_sz399006: { en: 'ChiNext', zh: '创业板指' },
};

export async function getSinaIndices(): Promise<SinaIndexQuote[]> {
  const url = `https://hq.sinajs.cn/list=${SINA_INDEX_CODES.join(',')}`;
  const res = await fetch(url, {
    headers: {
      Referer: 'https://finance.sina.com.cn',
    },
  });

  if (!res.ok) {
    throw new Error(`Sina API error: ${res.status}`);
  }

  const text = await res.text();
  const results: SinaIndexQuote[] = [];

  for (const code of SINA_INDEX_CODES) {
    const regex = new RegExp(`hq_str_${code}="([^"]+)"`);
    const match = text.match(regex);
    if (!match) continue;

    const parts = match[1].split(',');
    if (parts.length < 6) continue;

    results.push({
      code,
      name: INDEX_NAMES[code]?.zh ?? parts[0],
      price: parseFloat(parts[1]),
      change: parseFloat(parts[2]),
      changePct: parseFloat(parts[3]),
      volume: parseFloat(parts[4]),
      amount: parseFloat(parts[5]),
    });
  }

  return results;
}
