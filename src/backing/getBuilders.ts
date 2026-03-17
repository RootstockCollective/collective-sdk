import type { Address } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import type { ContractAddresses } from '../contracts/addresses'
import { BuilderRegistryAbi, GaugeAbi } from '../contracts/abis'
import type { Builder, BuilderStateFlags, BackerRewardPercentage } from '../types'
import { validateAddress } from '@rsksmart/sdk-base'

/**
 * Get list of all builders
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @returns Array of builders
 */
export async function getBuilders(
  w3: W3LayerInstance,
  addresses: ContractAddresses
): Promise<Builder[]> {
  const gaugesLength = await w3.readContract<bigint>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesLength',
    args: [],
  })

  if (gaugesLength === 0n) {
    return []
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

  const [stateResults, rewardPctResults, rewardToApplyResults, operationalResults, allocationResults] =
    await Promise.all([
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
      w3.multicall({
        contracts: builderAddresses.map(({ builder }) => ({
          address: addresses.builderRegistry,
          abi: BuilderRegistryAbi,
          functionName: 'getRewardPercentageToApply',
          args: [builder],
        })),
        allowFailure: true,
      }),
      w3.multicall({
        contracts: builderAddresses.map(({ builder }) => ({
          address: addresses.builderRegistry,
          abi: BuilderRegistryAbi,
          functionName: 'isBuilderOperational',
          args: [builder],
        })),
        allowFailure: true,
      }),
      w3.multicall({
        contracts: builderAddresses.map(({ gauge }) => ({
          address: gauge,
          abi: GaugeAbi,
          functionName: 'totalAllocation',
          args: [],
        })),
        allowFailure: true,
      }),
    ])

  const builders: Builder[] = builderAddresses.map((item, index) => {
    const stateResult = stateResults[index]
    const rewardPctResult = rewardPctResults[index]
    const rewardToApplyResult = rewardToApplyResults[index]
    const operationalResult = operationalResults[index]
    const allocationResult = allocationResults[index]

    const stateFlags: BuilderStateFlags =
      stateResult?.status === 'success'
        ? parseBuilderState(stateResult.result as BuilderStateRaw)
        : {
            initialized: false,
            kycApproved: false,
            communityApproved: false,
            kycPaused: false,
            selfPaused: false,
          }

    const backerRewardPct: BackerRewardPercentage =
      rewardPctResult?.status === 'success'
        ? parseRewardPercentage(rewardPctResult.result as RewardPercentageRaw)
        : { previous: 0n, next: 0n, cooldownEndTime: 0n }

    return {
      address: item.builder,
      gauge: item.gauge,
      stateFlags,
      backerRewardPct,
      rewardPercentageToApply:
        rewardToApplyResult?.status === 'success' ? (rewardToApplyResult.result as bigint) : 0n,
      isOperational:
        operationalResult?.status === 'success' ? (operationalResult.result as boolean) : false,
      totalAllocation:
        allocationResult?.status === 'success' ? (allocationResult.result as bigint) : 0n,
    }
  })

  return builders
}

/**
 * Get a specific builder by address
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param builderAddress - Address of the builder
 * @returns Builder or null if not found
 */
export async function getBuilder(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  builderAddress: Address
): Promise<Builder | null> {
  validateAddress(builderAddress)

  try {
    const gauge = await w3.readContract<Address>({
      address: addresses.builderRegistry,
      abi: BuilderRegistryAbi,
      functionName: 'builderToGauge',
      args: [builderAddress],
    })

    if (gauge === '0x0000000000000000000000000000000000000000') {
      return null
    }

    const [stateResult, rewardPctResult, rewardToApplyResult, operationalResult, allocationResult] =
      await Promise.all([
        w3.readContract<BuilderStateRaw>({
          address: addresses.builderRegistry,
          abi: BuilderRegistryAbi,
          functionName: 'builderState',
          args: [builderAddress],
        }),
        w3.readContract<RewardPercentageRaw>({
          address: addresses.builderRegistry,
          abi: BuilderRegistryAbi,
          functionName: 'backerRewardPercentage',
          args: [builderAddress],
        }),
        w3.readContract<bigint>({
          address: addresses.builderRegistry,
          abi: BuilderRegistryAbi,
          functionName: 'getRewardPercentageToApply',
          args: [builderAddress],
        }),
        w3.readContract<boolean>({
          address: addresses.builderRegistry,
          abi: BuilderRegistryAbi,
          functionName: 'isBuilderOperational',
          args: [builderAddress],
        }),
        w3.readContract<bigint>({
          address: gauge,
          abi: GaugeAbi,
          functionName: 'totalAllocation',
          args: [],
        }),
      ])

    return {
      address: builderAddress,
      gauge,
      stateFlags: parseBuilderState(stateResult),
      backerRewardPct: parseRewardPercentage(rewardPctResult),
      rewardPercentageToApply: rewardToApplyResult,
      isOperational: operationalResult,
      totalAllocation: allocationResult,
    }
  } catch {
    return null
  }
}

type BuilderStateRaw = [boolean, boolean, boolean, boolean, boolean, string, string]
type RewardPercentageRaw = [bigint, bigint, bigint]

function parseBuilderState(raw: BuilderStateRaw): BuilderStateFlags {
  return {
    initialized: raw[0],
    kycApproved: raw[1],
    communityApproved: raw[2],
    kycPaused: raw[3],
    selfPaused: raw[4],
  }
}

function parseRewardPercentage(raw: RewardPercentageRaw): BackerRewardPercentage {
  return {
    previous: raw[0],
    next: raw[1],
    cooldownEndTime: raw[2],
  }
}
