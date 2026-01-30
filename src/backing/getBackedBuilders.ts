import type { Address } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import { toTokenAmount, TOKEN_DECIMALS, type TokenAmount } from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import { BuilderRegistryAbi, GaugeAbi } from '../contracts/abis'

const STRIF_SYMBOL = 'stRIF'

/**
 * Information about a builder that a user is backing
 */
export interface BackedBuilder {
  /** Builder wallet address */
  builderAddress: Address
  /** Builder's gauge contract address */
  gaugeAddress: Address
  /** Amount allocated to this builder */
  allocation: TokenAmount
}

/**
 * Result of getBackedBuilders
 */
export interface BackedBuildersResult {
  /** List of builders the user is backing */
  builders: BackedBuilder[]
  /** Total amount allocated across all builders */
  totalAllocation: TokenAmount
}

/**
 * Get list of builders that a user is backing with their allocation amounts
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param backerAddress - Address of the backer
 * @returns List of backed builders with allocations
 */
export async function getBackedBuilders(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  backerAddress: Address
): Promise<BackedBuildersResult> {
  const gaugesLength = await w3.readContract<bigint>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesLength',
    args: [],
  })

  if (gaugesLength === 0n) {
    return {
      builders: [],
      totalAllocation: toTokenAmount(0n, TOKEN_DECIMALS.stRIF, STRIF_SYMBOL),
    }
  }

  const gauges = await w3.readContract<Address[]>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesInRange',
    args: [0n, gaugesLength],
  })

  const [allocationResults, builderResults] = await Promise.all([
    w3.multicall({
      contracts: gauges.map((gauge) => ({
        address: gauge,
        abi: GaugeAbi,
        functionName: 'allocationOf',
        args: [backerAddress],
      })),
      allowFailure: true,
    }),
    w3.multicall({
      contracts: gauges.map((gauge) => ({
        address: addresses.builderRegistry,
        abi: BuilderRegistryAbi,
        functionName: 'gaugeToBuilder',
        args: [gauge],
      })),
      allowFailure: true,
    }),
  ])

  const backedBuilders: BackedBuilder[] = []
  let totalAllocation = 0n

  for (let i = 0; i < gauges.length; i++) {
    const allocationResult = allocationResults[i]
    const builderResult = builderResults[i]

    if (
      allocationResult?.status === 'success' &&
      builderResult?.status === 'success'
    ) {
      const allocation = allocationResult.result as bigint
      const builderAddress = builderResult.result as Address

      if (allocation > 0n) {
        backedBuilders.push({
          builderAddress,
          gaugeAddress: gauges[i]!,
          allocation: toTokenAmount(allocation, TOKEN_DECIMALS.stRIF, STRIF_SYMBOL),
        })
        totalAllocation += allocation
      }
    }
  }

  backedBuilders.sort((a, b) => {
    if (b.allocation.value > a.allocation.value) return 1
    if (b.allocation.value < a.allocation.value) return -1
    return 0
  })

  return {
    builders: backedBuilders,
    totalAllocation: toTokenAmount(totalAllocation, TOKEN_DECIMALS.stRIF, STRIF_SYMBOL),
  }
}
