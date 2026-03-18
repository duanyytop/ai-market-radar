export interface NorthboundFlow {
  date: string;
  shConnect: number; // 沪股通净买入（万元）
  szConnect: number; // 深股通净买入（万元）
  total: number; // 合计净买入（万元）
}

export interface SectorFlow {
  name: string;
  changePct: number;
  netInflow: number; // 万元
  mainInflow: number; // 主力净流入（万元）
}

export interface MarketBreadth {
  upCount: number;
  downCount: number;
  flatCount: number;
  limitUp: number;
  limitDown: number;
  totalAmount: number; // 两市成交额（亿元）
}

async function fetchEastmoney<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Referer: 'https://data.eastmoney.com',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  if (!res.ok) {
    throw new Error(`Eastmoney API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Get latest northbound (沪深港通) fund flow.
 */
export async function getNorthboundFlow(): Promise<NorthboundFlow | null> {
  // HSGT daily summary
  const url =
    'https://push2his.eastmoney.com/api/qt/kamt.kline/get?fields1=f1,f3&fields2=f51,f52,f54,f56&klt=101&lmt=1';

  interface HsgtResponse {
    data?: {
      s2n?: string[];
    };
  }

  const data = await fetchEastmoney<HsgtResponse>(url);
  const lines = data?.data?.s2n;
  if (!lines || lines.length === 0) return null;

  // Latest line format: "2026-03-17,12.34,56.78,69.12"
  const latest = lines[lines.length - 1];
  const parts = latest.split(',');
  if (parts.length < 4) return null;

  const sh = parseFloat(parts[1]) || 0;
  const sz = parseFloat(parts[2]) || 0;

  return {
    date: parts[0],
    shConnect: sh,
    szConnect: sz,
    total: sh + sz,
  };
}

/**
 * Get top sector fund flows (板块资金流向).
 */
export async function getSectorFlows(topN: number = 5): Promise<{
  inflow: SectorFlow[];
  outflow: SectorFlow[];
}> {
  // Sector money flow ranking
  const url =
    'https://push2.eastmoney.com/api/qt/clist/get?fid=f62&po=1&pz=20&np=1&fltt=2&fs=m:90+t:2&fields=f14,f3,f62,f184';

  interface SectorResponse {
    data?: {
      diff?: Array<{
        f14: string; // name
        f3: number; // changePct
        f62: number; // net inflow (元)
        f184: number; // main net inflow (元)
      }>;
    };
  }

  const data = await fetchEastmoney<SectorResponse>(url);
  const items = data?.data?.diff;
  if (!items || items.length === 0) return { inflow: [], outflow: [] };

  const mapped: SectorFlow[] = items.map((item) => ({
    name: item.f14,
    changePct: item.f3,
    netInflow: item.f62 / 10000, // 元 -> 万元
    mainInflow: item.f184 / 10000,
  }));

  const inflow = mapped.filter((s) => s.netInflow > 0).slice(0, topN);
  const outflow = mapped
    .filter((s) => s.netInflow < 0)
    .sort((a, b) => a.netInflow - b.netInflow)
    .slice(0, topN);

  return { inflow, outflow };
}

/**
 * Get market breadth (涨跌家数 + 涨跌停).
 */
export async function getMarketBreadth(): Promise<MarketBreadth> {
  let totalAmount = 0;
  let upCount = 0;
  let downCount = 0;

  try {
    const indexUrl =
      'https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f6,f12,f14,f104,f105,f106&secids=1.000001';

    interface IndexResponse {
      data?: {
        diff?: Array<{
          f104: number; // up count
          f105: number; // down count
          f106: number; // flat count
          f6: number; // amount
        }>;
      };
    }

    const indexData = await fetchEastmoney<IndexResponse>(indexUrl);
    const idx = indexData?.data?.diff?.[0];
    if (idx) {
      upCount = idx.f104 ?? 0;
      downCount = idx.f105 ?? 0;
      totalAmount = (idx.f6 ?? 0) / 1e8; // 元 -> 亿元（上证成交额，需 ×2 估算两市）
    }
  } catch {
    // ignore
  }

  // Rough estimate: 上证 ≈ 两市的 ~55%
  const estimatedTotalAmount = totalAmount > 0 ? totalAmount / 0.55 : 0;

  return {
    upCount,
    downCount,
    flatCount: 0,
    limitUp: 0, // TODO: need separate API
    limitDown: 0,
    totalAmount: Math.round(estimatedTotalAmount),
  };
}
