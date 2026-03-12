import type { PublicClient } from 'viem';
import { formatUnits } from 'viem';
import type { TokenBalance } from '../types.js';

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

export async function getTokenBalance(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  walletAddress: `0x${string}`,
): Promise<TokenBalance> {
  const [rawBalance, decimals, symbol] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    }),
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    }),
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol',
    }),
  ]);

  return {
    symbol,
    address: tokenAddress,
    balance: formatUnits(rawBalance, decimals),
    decimals,
  };
}

export async function getNativeBalance(
  client: PublicClient,
  address: `0x${string}`,
): Promise<string> {
  const balance = await client.getBalance({ address });
  return formatUnits(balance, 18);
}

export async function getMultipleTokenBalances(
  client: PublicClient,
  tokenAddresses: `0x${string}`[],
  walletAddress: `0x${string}`,
): Promise<TokenBalance[]> {
  const results = await Promise.allSettled(
    tokenAddresses.map((addr) => getTokenBalance(client, addr, walletAddress)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<TokenBalance> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((t) => parseFloat(t.balance) > 0);
}
