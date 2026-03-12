import type { PublicClient } from 'viem';
import { formatUnits } from 'viem';
import type { AavePosition, ChainName } from '../types.js';
import { AAVE_V3_POOL } from '../chains/index.js';

const AAVE_V3_POOL_ABI = [
  {
    name: 'getUserAccountData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalCollateralBase', type: 'uint256' },
      { name: 'totalDebtBase', type: 'uint256' },
      { name: 'availableBorrowsBase', type: 'uint256' },
      { name: 'currentLiquidationThreshold', type: 'uint256' },
      { name: 'ltv', type: 'uint256' },
      { name: 'healthFactor', type: 'uint256' },
    ],
  },
] as const;

export async function getAavePosition(
  client: PublicClient,
  chain: ChainName,
  walletAddress: `0x${string}`,
  healthFactorThreshold: number = 1.5,
): Promise<AavePosition | null> {
  const poolAddress = AAVE_V3_POOL[chain];

  const result = await client.readContract({
    address: poolAddress,
    abi: AAVE_V3_POOL_ABI,
    functionName: 'getUserAccountData',
    args: [walletAddress],
  });

  const [
    totalCollateralBase,
    totalDebtBase,
    availableBorrowsBase,
    currentLiquidationThreshold,
    ltv,
    healthFactor,
  ] = result;

  // If no collateral and no debt, user has no Aave position
  if (totalCollateralBase === 0n && totalDebtBase === 0n) {
    return null;
  }

  // Aave returns values in base currency (USD) with 8 decimals
  const totalCollateralUsd = parseFloat(formatUnits(totalCollateralBase, 8));
  const totalDebtUsd = parseFloat(formatUnits(totalDebtBase, 8));
  const availableBorrowsUsd = parseFloat(formatUnits(availableBorrowsBase, 8));

  // Liquidation threshold and LTV are in basis points (e.g., 8000 = 80%)
  const liqThreshold = Number(currentLiquidationThreshold) / 10000;
  const ltvValue = Number(ltv) / 10000;

  // Health factor is scaled by 1e18
  const hf = parseFloat(formatUnits(healthFactor, 18));

  return {
    chain,
    totalCollateralUsd,
    totalDebtUsd,
    availableBorrowsUsd,
    currentLiquidationThreshold: liqThreshold,
    ltv: ltvValue,
    healthFactor: hf,
    isAtRisk: hf < healthFactorThreshold,
  };
}
