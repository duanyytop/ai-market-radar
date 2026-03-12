import type { PublicClient } from 'viem';
import { getAddress } from 'viem';
import type { UniswapV3Position, ChainName } from '../types.js';
import { UNISWAP_V3_POSITION_MANAGER, UNISWAP_V3_FACTORY } from '../chains/index.js';

const POSITION_MANAGER_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'positions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'nonce', type: 'uint96' },
      { name: 'operator', type: 'address' },
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0', type: 'uint128' },
      { name: 'tokensOwed1', type: 'uint128' },
    ],
  },
] as const;

const FACTORY_ABI = [
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const;

const POOL_ABI = [
  {
    name: 'slot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
] as const;

export async function getUniswapPositions(
  client: PublicClient,
  chain: ChainName,
  walletAddress: `0x${string}`,
): Promise<UniswapV3Position[]> {
  const positionManager = UNISWAP_V3_POSITION_MANAGER[chain];
  const factory = UNISWAP_V3_FACTORY[chain];

  // Get number of positions
  const positionCount = await client.readContract({
    address: positionManager,
    abi: POSITION_MANAGER_ABI,
    functionName: 'balanceOf',
    args: [walletAddress],
  });

  if (positionCount === 0n) return [];

  // Get all token IDs
  const count = Number(positionCount);
  const tokenIdPromises = Array.from({ length: count }, (_, i) =>
    client.readContract({
      address: positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: [walletAddress, BigInt(i)],
    }),
  );
  const tokenIds = await Promise.all(tokenIdPromises);

  // Get position details for each token ID
  const positionPromises = tokenIds.map((tokenId) =>
    client.readContract({
      address: positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'positions',
      args: [tokenId],
    }),
  );
  const positions = await Promise.all(positionPromises);

  // Filter out closed positions (zero liquidity)
  const activePositions = positions
    .map((pos, i) => ({ pos, tokenId: tokenIds[i] }))
    .filter(({ pos }) => pos[7] > 0n); // liquidity > 0

  if (activePositions.length === 0) return [];

  // Get current ticks for each unique pool
  const poolKeys = new Map<string, { token0: `0x${string}`; token1: `0x${string}`; fee: number }>();
  for (const { pos } of activePositions) {
    const key = `${pos[2]}-${pos[3]}-${pos[4]}`;
    if (!poolKeys.has(key)) {
      poolKeys.set(key, {
        token0: getAddress(pos[2]) as `0x${string}`,
        token1: getAddress(pos[3]) as `0x${string}`,
        fee: Number(pos[4]),
      });
    }
  }

  // Fetch pool addresses and current ticks
  const currentTicks = new Map<string, number>();
  for (const [key, { token0, token1, fee }] of poolKeys) {
    try {
      const poolAddress = await client.readContract({
        address: factory,
        abi: FACTORY_ABI,
        functionName: 'getPool',
        args: [token0, token1, fee],
      });

      const slot0 = await client.readContract({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'slot0',
      });
      currentTicks.set(key, Number(slot0[1]));
    } catch {
      // Pool might not exist on this chain
      currentTicks.set(key, 0);
    }
  }

  return activePositions.map(({ pos, tokenId }) => {
    const key = `${pos[2]}-${pos[3]}-${pos[4]}`;
    const currentTick = currentTicks.get(key) ?? 0;
    const tickLower = Number(pos[5]);
    const tickUpper = Number(pos[6]);

    return {
      tokenId: tokenId.toString(),
      chain,
      token0: getAddress(pos[2]),
      token1: getAddress(pos[3]),
      fee: Number(pos[4]),
      tickLower,
      tickUpper,
      currentTick,
      liquidity: pos[7].toString(),
      inRange: currentTick >= tickLower && currentTick < tickUpper,
    };
  });
}
