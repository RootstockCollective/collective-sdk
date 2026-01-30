import type { Address } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import { toTokenAmount, TOKEN_DECIMALS } from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import { StRIFTokenAbi, BackersManagerAbi } from '../contracts/abis'
import type { AvailableForBacking } from '../types'

const STRIF_SYMBOL = 'stRIF'

/**
 * Get available balance for backing for a given user
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param backerAddress - Address of the backer
 * @returns Available backing information
 */
export async function getAvailableForBacking(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  backerAddress: Address
): Promise<AvailableForBacking> {
  const results = await w3.multicall({
    contracts: [
      {
        address: addresses.stRIF,
        abi: StRIFTokenAbi,
        functionName: 'balanceOf',
        args: [backerAddress],
      },
      {
        address: addresses.backersManager,
        abi: BackersManagerAbi,
        functionName: 'backerTotalAllocation',
        args: [backerAddress],
      },
    ],
    allowFailure: true,
  })

  const balance = (results[0]?.status === 'success' ? results[0].result : 0n) as bigint
  const totalAllocated = (results[1]?.status === 'success' ? results[1].result : 0n) as bigint
  const available = balance > totalAllocated ? balance - totalAllocated : 0n

  return {
    balance: toTokenAmount(balance, TOKEN_DECIMALS.stRIF, STRIF_SYMBOL),
    totalAllocated: toTokenAmount(totalAllocated, TOKEN_DECIMALS.stRIF, STRIF_SYMBOL),
    available: toTokenAmount(available, TOKEN_DECIMALS.stRIF, STRIF_SYMBOL),
  }
}
