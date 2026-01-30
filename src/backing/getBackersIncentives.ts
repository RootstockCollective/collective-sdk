import type { W3LayerInstance } from '@rsksmart/w3layer'
import {
  toTokenAmount,
  formatPercentage,
  createPriceService,
  calculateABI,
  TOKEN_DECIMALS,
  type TokenPrices,
} from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import { BackersManagerAbi, BuilderRegistryAbi, GaugeAbi } from '../contracts/abis'
import type { BackersIncentives, BackerRewardPercentage } from '../types'
import type { Address } from 'viem'

const PERCENTAGE_PRECISION = 10000
const WEI_PER_ETHER = 10n ** 18n

/**
 * Get global backers incentives statistics
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @returns Backers incentives information
 */
export async function getBackersIncentives(
  w3: W3LayerInstance,
  addresses: ContractAddresses
): Promise<BackersIncentives> {
  const priceService = createPriceService({ chainId: w3.chainId })

  const [rewardsRif, rewardsNative, rewardsUsdrif, totalPotentialReward, prices] = await Promise.all(
    [
      w3.readContract<bigint>({
        address: addresses.backersManager,
        abi: BackersManagerAbi,
        functionName: 'rewardsRif',
        args: [],
      }),
      w3.readContract<bigint>({
        address: addresses.backersManager,
        abi: BackersManagerAbi,
        functionName: 'rewardsNative',
        args: [],
      }),
      w3.readContract<bigint>({
        address: addresses.backersManager,
        abi: BackersManagerAbi,
        functionName: 'rewardsUsdrif',
        args: [],
      }),
      w3.readContract<bigint>({
        address: addresses.backersManager,
        abi: BackersManagerAbi,
        functionName: 'totalPotentialReward',
        args: [],
      }),
      priceService.fetchPrices().catch(() => null),
    ]
  )

  const abiResult = await calculateABICompound(
    w3,
    addresses,
    rewardsRif,
    rewardsNative,
    rewardsUsdrif,
    prices
  )

  return {
    annualPercentage: formatPercentage(
      Math.round(abiResult.percentage * 100),
      PERCENTAGE_PRECISION
    ),
    rewardsRif: toTokenAmount(rewardsRif, TOKEN_DECIMALS.RIF, 'RIF'),
    rewardsNative: toTokenAmount(rewardsNative, TOKEN_DECIMALS.RBTC, 'RBTC'),
    rewardsUsdrif: toTokenAmount(rewardsUsdrif, TOKEN_DECIMALS.USDRIF, 'USDRIF'),
    totalPotentialReward: toTokenAmount(totalPotentialReward, TOKEN_DECIMALS.RIF),
  }
}

/**
 * Get the current backer reward percentage based on cooldown
 */
function getCurrentBackerRewardPct(pct: BackerRewardPercentage): bigint {
  const now = BigInt(Math.floor(Date.now() / 1000))

  return pct.cooldownEndTime <= now ? pct.next : pct.previous
}

/**
 * Check if a builder is rewardable (operational)
 */
function isBuilderRewardable(builder: {
  stateFlags: { kycApproved: boolean; communityApproved: boolean; kycPaused: boolean; selfPaused: boolean }
}): boolean {
  const { kycApproved, communityApproved, kycPaused, selfPaused } = builder.stateFlags
  return kycApproved && communityApproved && !kycPaused && !selfPaused
}

interface ABIResult {
  percentage: number
  totalAllocation: bigint
  weightedAvgBackerRewardPct: bigint
}

/**
 * Calculate Annual Backers Incentives using compound formula
 * Formula: ABI = ((1 + rewardsPerStRif / rifPrice)^26 - 1) * 100
 */
async function calculateABICompound(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  rewardsRif: bigint,
  rewardsNative: bigint,
  rewardsUsdrif: bigint,
  prices: TokenPrices | null
): Promise<ABIResult> {
  const gaugesLength = await w3.readContract<bigint>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesLength',
    args: [],
  })

  if (gaugesLength === 0n) {
    return { percentage: 0, totalAllocation: 0n, weightedAvgBackerRewardPct: 0n }
  }

  const gauges = await w3.readContract<Address[]>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesInRange',
    args: [0n, gaugesLength],
  })

  const builderResults = await w3.multicall({
    contracts: gauges.map((gauge) => ({
      address: addresses.builderRegistry,
      abi: BuilderRegistryAbi,
      functionName: 'gaugeToBuilder',
      args: [gauge],
    })),
    allowFailure: true,
  })

  const builderAddresses = builderResults
    .map((result, index) => ({
      builder: result.status === 'success' ? (result.result as Address) : null,
      gauge: gauges[index]!,
    }))
    .filter((item): item is { builder: Address; gauge: Address } => item.builder !== null)

  const [allocationResults, stateResults, rewardPctResults] = await Promise.all([
    w3.multicall({
      contracts: builderAddresses.map(({ gauge }) => ({
        address: gauge,
        abi: GaugeAbi,
        functionName: 'totalAllocation',
        args: [],
      })),
      allowFailure: true,
    }),
    w3.multicall({
      contracts: builderAddresses.map(({ builder }) => ({
        address: addresses.builderRegistry,
        abi: BuilderRegistryAbi,
        functionName: 'builderState',
        args: [builder],
      })),
      allowFailure: true,
    }),
    w3.multicall({
      contracts: builderAddresses.map(({ builder }) => ({
        address: addresses.builderRegistry,
        abi: BuilderRegistryAbi,
        functionName: 'backerRewardPercentage',
        args: [builder],
      })),
      allowFailure: true,
    }),
  ])

  type BuilderData = {
    allocation: bigint
    backerRewardPct: BackerRewardPercentage
    isRewardable: boolean
  }

  const buildersData: BuilderData[] = []

  for (let i = 0; i < builderAddresses.length; i++) {
    const allocationResult = allocationResults[i]
    const stateResult = stateResults[i]
    const rewardPctResult = rewardPctResults[i]

    if (
      allocationResult?.status !== 'success' ||
      stateResult?.status !== 'success' ||
      rewardPctResult?.status !== 'success'
    ) {
      continue
    }

    const allocation = allocationResult.result as bigint
    const stateRaw = stateResult.result as [boolean, boolean, boolean, boolean, boolean, string, string]
    const rewardPctRaw = rewardPctResult.result as [bigint, bigint, bigint]

    if (allocation === 0n) {
      continue
    }

    const stateFlags = {
      initialized: stateRaw[0],
      kycApproved: stateRaw[1],
      communityApproved: stateRaw[2],
      kycPaused: stateRaw[3],
      selfPaused: stateRaw[4],
    }

    const backerRewardPct: BackerRewardPercentage = {
      previous: rewardPctRaw[0],
      next: rewardPctRaw[1],
      cooldownEndTime: rewardPctRaw[2],
    }

    buildersData.push({
      allocation,
      backerRewardPct,
      isRewardable: isBuilderRewardable({ stateFlags }),
    })
  }

  const totalAllocation = buildersData.reduce((sum, b) => sum + b.allocation, 0n)

  if (totalAllocation === 0n) {
    return { percentage: 0, totalAllocation: 0n, weightedAvgBackerRewardPct: 0n }
  }

  // TODO define here if 5 is the correct number of builders to use or if we should have that configurable
  const rewardableBuilders = buildersData
    .filter((b) => b.isRewardable)
    .sort((a, b) => (b.allocation > a.allocation ? 1 : -1))
    .slice(0, 5)

  if (rewardableBuilders.length === 0) {
    return { percentage: 0, totalAllocation, weightedAvgBackerRewardPct: 0n }
  }

  const top5TotalAllocation = rewardableBuilders.reduce((sum, b) => sum + b.allocation, 0n)

  let weightedSum = 0n
  for (const builder of rewardableBuilders) {
    const currentPct = getCurrentBackerRewardPct(builder.backerRewardPct)
    weightedSum += builder.allocation * currentPct
  }

  const weightedAvgBackerRewardPct = top5TotalAllocation > 0n ? weightedSum / top5TotalAllocation : 0n

  if (!prices || !prices.RIF?.price) {
    const weightedPctNormalized = Number(weightedAvgBackerRewardPct) / Number(WEI_PER_ETHER)
    const simpleRate =
      (Number(rewardsRif) / Number(totalAllocation)) * weightedPctNormalized * 26

    return {
      percentage: simpleRate * 100,
      totalAllocation,
      weightedAvgBackerRewardPct,
    }
  }

  const abiPercentage = calculateABI(
    {
      rewardsRif,
      rewardsRbtc: rewardsNative,
      rewardsUsdrif,
      totalAllocation,
      weightedAvgBackerRewardPct,
    },
    prices
  )

  return {
    percentage: abiPercentage,
    totalAllocation,
    weightedAvgBackerRewardPct,
  }
}
