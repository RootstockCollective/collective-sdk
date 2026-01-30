import type { Address } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import { toTokenAmount, TOKEN_DECIMALS, type TokenAmount } from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import { BuilderRegistryAbi, GaugeAbi } from '../contracts/abis'

/**
 * Unclaimed rewards for a backer
 */
export interface UnclaimedRewards {
  /** Unclaimed RIF rewards */
  rif: TokenAmount
  /** Unclaimed RBTC rewards */
  rbtc: TokenAmount
  /** Unclaimed USDRIF rewards */
  usdrif: TokenAmount
  /** Total USD value of unclaimed rewards */
  totalUSD?: number
}

/**
 * Get unclaimed rewards for a backer across all active builders
 *
 * The function calls `gauge.earned(tokenAddress, backerAddress)` for each
 * active builder's gauge and sums up the results.
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param backerAddress - Address of the backer
 * @returns Unclaimed rewards
 */
export async function getUnclaimedRewards(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  backerAddress: Address
): Promise<UnclaimedRewards> {
  const gaugesLength = await w3.readContract<bigint>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesLength',
    args: [],
  })

  if (gaugesLength === 0n) {
    return {
      rif: toTokenAmount(0n, TOKEN_DECIMALS.RIF, 'RIF'),
      rbtc: toTokenAmount(0n, TOKEN_DECIMALS.RBTC, 'RBTC'),
      usdrif: toTokenAmount(0n, TOKEN_DECIMALS.USDRIF, 'USDRIF'),
    }
  }

  const gauges = await w3.readContract<Address[]>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesInRange',
    args: [0n, gaugesLength],
  })

  const earnedCalls = gauges.flatMap((gauge) => [
    {
      address: gauge,
      abi: GaugeAbi,
      functionName: 'earned',
      args: [addresses.RIF, backerAddress],
    },
    {
      address: gauge,
      abi: GaugeAbi,
      functionName: 'earned',
      args: [addresses.COINBASE_ADDRESS, backerAddress],
    },
    {
      address: gauge,
      abi: GaugeAbi,
      functionName: 'earned',
      args: [addresses.USDRIF, backerAddress],
    },
  ])

  const results = await w3.multicall({
    contracts: earnedCalls,
    allowFailure: true,
  })

  let totalRif = 0n
  let totalRbtc = 0n
  let totalUsdrif = 0n

  for (let i = 0; i < gauges.length; i++) {
    const rifIndex = i * 3
    const rbtcIndex = i * 3 + 1
    const usdrifIndex = i * 3 + 2

    if (results[rifIndex]?.status === 'success') {
      totalRif += results[rifIndex].result as bigint
    }
    if (results[rbtcIndex]?.status === 'success') {
      totalRbtc += results[rbtcIndex].result as bigint
    }
    if (results[usdrifIndex]?.status === 'success') {
      totalUsdrif += results[usdrifIndex].result as bigint
    }
  }

  return {
    rif: toTokenAmount(totalRif, TOKEN_DECIMALS.RIF, 'RIF'),
    rbtc: toTokenAmount(totalRbtc, TOKEN_DECIMALS.RBTC, 'RBTC'),
    usdrif: toTokenAmount(totalUsdrif, TOKEN_DECIMALS.USDRIF, 'USDRIF'),
  }
}
