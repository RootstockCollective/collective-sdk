import type { Address } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import { toTokenAmount, TOKEN_DECIMALS } from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import { BackersManagerAbi, BuilderRegistryAbi, GaugeAbi } from '../contracts/abis'
import type { TotalBacking } from '../types'

const STRIF_SYMBOL = 'stRIF'

/**
 * Get total backing information for a given user
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param backerAddress - Address of the backer
 * @returns Total backing information
 */
export async function getTotalBacking(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  backerAddress: Address
): Promise<TotalBacking> {
  const totalAllocation = await w3.readContract<bigint>({
    address: addresses.backersManager,
    abi: BackersManagerAbi,
    functionName: 'backerTotalAllocation',
    args: [backerAddress],
  })

  const gaugesLength = await w3.readContract<bigint>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesLength',
    args: [],
  })

  if (gaugesLength === 0n || totalAllocation === 0n) {
    return {
      amount: toTokenAmount(totalAllocation, TOKEN_DECIMALS.stRIF, STRIF_SYMBOL),
      buildersCount: 0,
    }
  }

  const gauges = await w3.readContract<Address[]>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'getGaugesInRange',
    args: [0n, gaugesLength],
  })

  const allocationResults = await w3.multicall({
    contracts: gauges.map((gauge) => ({
      address: gauge,
      abi: GaugeAbi,
      functionName: 'allocationOf',
      args: [backerAddress],
    })),
    allowFailure: true,
  })

  const buildersCount = allocationResults.filter(
    (result) => result.status === 'success' && (result.result as bigint) > 0n
  ).length

  return {
    amount: toTokenAmount(totalAllocation, TOKEN_DECIMALS.stRIF, STRIF_SYMBOL),
    buildersCount,
  }
}
