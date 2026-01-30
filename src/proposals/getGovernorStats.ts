import type { W3LayerInstance } from '@rsksmart/w3layer'
import { toTokenAmount, TOKEN_DECIMALS } from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import { GovernorAbi } from '../contracts/abis'
import { ProposalState, type GovernorStats } from './types'

/**
 * Get Governor contract statistics
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @returns Governor statistics
 */
export async function getGovernorStats(
  w3: W3LayerInstance,
  addresses: ContractAddresses
): Promise<GovernorStats> {
  const results = await w3.multicall({
    contracts: [
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'proposalCount',
        args: [],
      },
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'proposalThreshold',
        args: [],
      },
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'quorumNumerator',
        args: [],
      },
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'quorumDenominator',
        args: [],
      },
    ],
    allowFailure: true,
  })

  const proposalCount =
    results[0]?.status === 'success' ? Number(results[0].result as bigint) : 0
  const proposalThreshold =
    results[1]?.status === 'success' ? (results[1].result as bigint) : 0n
  const quorumNumerator =
    results[2]?.status === 'success' ? Number(results[2].result as bigint) : 0
  const quorumDenominator =
    results[3]?.status === 'success' ? Number(results[3].result as bigint) : 100

  const quorumPercentage =
    quorumDenominator > 0 ? (quorumNumerator / quorumDenominator) * 100 : 0

  let activeProposals = 0
  if (proposalCount > 0) {
    const checkCount = Math.min(proposalCount, 20) // TODO: Make this configurable (for now we are using 20 as the default value)
    const stateCalls = []

    for (let i = proposalCount - 1; i >= proposalCount - checkCount; i--) {
      stateCalls.push({
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'proposalDetailsAt',
        args: [BigInt(i)],
      })
    }

    const detailsResults = await w3.multicall({
      contracts: stateCalls,
      allowFailure: true,
    })

    const proposalIds: bigint[] = []
    for (const result of detailsResults) {
      if (result?.status === 'success') {
        const [proposalId] = result.result as [bigint, unknown[], bigint[], `0x${string}`[], `0x${string}`]
        proposalIds.push(proposalId)
      }
    }

    const stateCheckCalls = proposalIds.map((id) => ({
      address: addresses.governor,
      abi: GovernorAbi,
      functionName: 'state',
      args: [id],
    }))

    const stateResults = await w3.multicall({
      contracts: stateCheckCalls,
      allowFailure: true,
    })

    for (const result of stateResults) {
      if (result?.status === 'success') {
        const state = result.result as number
        if (state === ProposalState.Active) {
          activeProposals++
        }
      }
    }
  }

  return {
    proposalCount,
    activeProposals,
    proposalThreshold: toTokenAmount(proposalThreshold, TOKEN_DECIMALS.stRIF, 'stRIF'),
    quorumPercentage,
  }
}
