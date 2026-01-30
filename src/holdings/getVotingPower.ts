import type { Address } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import { toTokenAmount, TOKEN_DECIMALS, type TokenAmount } from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import { StRIFTokenAbi } from '../contracts/abis'

/**
 * Voting power information
 */
export interface VotingPower {
  /** Voting power as TokenAmount (stRIF balance) */
  amount: TokenAmount
  /** Whether the user has any voting power */
  hasVotingPower: boolean
}

/**
 * Get voting power for a user
 *
 * Voting power in the Collective DAO is determined by stRIF balance.
 * 1 stRIF = 1 vote
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param userAddress - Address to check voting power for
 * @returns Voting power information
 */
export async function getVotingPower(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  userAddress: Address
): Promise<VotingPower> {
  const balance = await w3.readContract<bigint>({
    address: addresses.stRIF,
    abi: StRIFTokenAbi,
    functionName: 'balanceOf',
    args: [userAddress],
  })

  return {
    amount: toTokenAmount(balance, TOKEN_DECIMALS.stRIF, 'stRIF'),
    hasVotingPower: balance > 0n,
  }
}
