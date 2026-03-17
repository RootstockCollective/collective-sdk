import type { Address } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import { toTokenAmount, TOKEN_DECIMALS, type TokenAmount, validateAddress } from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import { BuilderRegistryAbi, GaugeAbi } from '../contracts/abis'

/**
 * Reward amounts for a specific token
 */
export interface TokenRewardAmount {
  /** Token symbol */
  symbol: string
  /** Token address */
  tokenAddress: Address
  /** Reward amount */
  amount: TokenAmount
}

/**
 * Detailed rewards for a specific gauge
 */
export interface GaugeRewards {
  /** Gauge contract address */
  gaugeAddress: Address
  /** Builder address associated with this gauge */
  builderAddress: Address | null
  /** RIF rewards for this gauge */
  rif: TokenAmount
  /** RBTC rewards for this gauge */
  rbtc: TokenAmount
  /** USDRIF rewards for this gauge */
  usdrif: TokenAmount
  /** Whether this gauge has any rewards */
  hasRewards: boolean
  /** Total USD value estimate (if available) */
  totalUSD?: number
}

/**
 * Summary of rewards by token type
 */
export interface RewardsSummary {
  /** Total RIF rewards across all gauges */
  totalRif: TokenAmount
  /** Total RBTC rewards across all gauges */
  totalRbtc: TokenAmount
  /** Total USDRIF rewards across all gauges */
  totalUsdrif: TokenAmount
  /** Total number of gauges with any rewards */
  gaugesWithRewards: number
  /** Whether there are any rewards to claim */
  hasRewards: boolean
}

/**
 * Detailed rewards list result
 */
export interface DetailedRewardsList {
  /** Summary of all rewards */
  summary: RewardsSummary
  /** List of gauges with their individual rewards */
  gauges: GaugeRewards[]
  /** Only gauges that have rewards (filtered) */
  gaugesWithRewards: GaugeRewards[]
}

/**
 * Get a detailed list of rewards per gauge and per token
 *
 * This function provides structured reward information with:
 * - Per-gauge breakdown of rewards for each token (RIF, RBTC, USDRIF)
 * - Summary totals across all gauges
 * - Filtered list of only gauges with rewards
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param backerAddress - Address of the backer
 * @returns Detailed rewards list with per-gauge and per-token amounts
 *
 * @example
 * ```ts
 * const rewards = await sdk.holdings.getDetailedRewardsList(myAddress)
 *
 * // Access summary
 * console.log('Total RIF:', rewards.summary.totalRif.formatted)
 * console.log('Total RBTC:', rewards.summary.totalRbtc.formatted)
 *
 * // Iterate over gauges with rewards
 * for (const gauge of rewards.gaugesWithRewards) {
 *   console.log(`Gauge ${gauge.gaugeAddress}:`)
 *   console.log(`  RIF: ${gauge.rif.formatted}`)
 *   console.log(`  RBTC: ${gauge.rbtc.formatted}`)
 *   console.log(`  USDRIF: ${gauge.usdrif.formatted}`)
 * }
 * ```
 */
export async function getDetailedRewardsList(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  backerAddress: Address
): Promise<DetailedRewardsList> {
  validateAddress(backerAddress)
  
  const gaugesLength = await w3.readContract<bigint>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesLength',
    args: [],
  })

  if (gaugesLength === 0n) {
    return {
      summary: {
        totalRif: toTokenAmount(0n, TOKEN_DECIMALS.RIF, 'RIF'),
        totalRbtc: toTokenAmount(0n, TOKEN_DECIMALS.RBTC, 'RBTC'),
        totalUsdrif: toTokenAmount(0n, TOKEN_DECIMALS.USDRIF, 'USDRIF'),
        gaugesWithRewards: 0,
        hasRewards: false,
      },
      gauges: [],
      gaugesWithRewards: [],
    }
  }

  const gaugeAddresses = await w3.readContract<Address[]>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesInRange',
    args: [0n, gaugesLength],
  })

  const earnedCalls = gaugeAddresses.flatMap((gauge) => [
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
    {
      address: gauge,
      abi: GaugeAbi,
      functionName: 'builder',
      args: [],
    },
  ])

  const results = await w3.multicall({
    contracts: earnedCalls,
    allowFailure: true,
  })

  const gauges: GaugeRewards[] = []
  let totalRif = 0n
  let totalRbtc = 0n
  let totalUsdrif = 0n
  let gaugesWithRewardsCount = 0

  for (let i = 0; i < gaugeAddresses.length; i++) {
    const gaugeAddress = gaugeAddresses[i]
    const baseIndex = i * 4

    const rifEarned = results[baseIndex]?.status === 'success'
      ? (results[baseIndex].result as bigint)
      : 0n
    const rbtcEarned = results[baseIndex + 1]?.status === 'success'
      ? (results[baseIndex + 1].result as bigint)
      : 0n
    const usdrifEarned = results[baseIndex + 2]?.status === 'success'
      ? (results[baseIndex + 2].result as bigint)
      : 0n
    const builderAddress = results[baseIndex + 3]?.status === 'success'
      ? (results[baseIndex + 3].result as Address)
      : null

    const hasRewards = rifEarned > 0n || rbtcEarned > 0n || usdrifEarned > 0n

    if (hasRewards) {
      gaugesWithRewardsCount++
    }

    totalRif += rifEarned
    totalRbtc += rbtcEarned
    totalUsdrif += usdrifEarned

    gauges.push({
      gaugeAddress,
      builderAddress,
      rif: toTokenAmount(rifEarned, TOKEN_DECIMALS.RIF, 'RIF'),
      rbtc: toTokenAmount(rbtcEarned, TOKEN_DECIMALS.RBTC, 'RBTC'),
      usdrif: toTokenAmount(usdrifEarned, TOKEN_DECIMALS.USDRIF, 'USDRIF'),
      hasRewards,
    })
  }

  const summary: RewardsSummary = {
    totalRif: toTokenAmount(totalRif, TOKEN_DECIMALS.RIF, 'RIF'),
    totalRbtc: toTokenAmount(totalRbtc, TOKEN_DECIMALS.RBTC, 'RBTC'),
    totalUsdrif: toTokenAmount(totalUsdrif, TOKEN_DECIMALS.USDRIF, 'USDRIF'),
    gaugesWithRewards: gaugesWithRewardsCount,
    hasRewards: gaugesWithRewardsCount > 0,
  }

  return {
    summary,
    gauges,
    gaugesWithRewards: gauges.filter((g) => g.hasRewards),
  }
}
