import type { Address } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import type { ContractAddresses } from '../contracts/addresses'
import { GovernorAbi } from '../contracts/abis'
import { ProposalState, ProposalStateLabels, type ProposalSummary, type ProposalsListResult } from './types'

/**
 * Get a paginated list of proposals
 *
 * Fetches proposals from the Governor contract using proposalDetailsAt
 * for efficient batch retrieval.
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param options - Pagination options
 * @returns List of proposal summaries
 */
export async function getProposals(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  options: {
    /** Starting index (0-based, default: 0) */
    offset?: number
    /** Number of proposals to fetch (default: 20, max: 100) */
    limit?: number
  } = {}
): Promise<ProposalsListResult> {
  const { offset = 0, limit = 20 } = options
  const effectiveLimit = Math.min(limit, 100)

  const totalCount = await w3.readContract<bigint>({
    address: addresses.governor,
    abi: GovernorAbi,
    functionName: 'proposalCount',
    args: [],
  })

  const total = Number(totalCount)

  if (total === 0 || offset >= total) {
    return { totalCount: total, proposals: [] }
  }

  const startIndex = Math.max(0, total - 1 - offset)
  const endIndex = Math.max(0, startIndex - effectiveLimit + 1)

  const detailsCalls = []
  for (let i = startIndex; i >= endIndex; i--) {
    detailsCalls.push({
      address: addresses.governor,
      abi: GovernorAbi,
      functionName: 'proposalDetailsAt',
      args: [BigInt(i)],
    })
  }

  const detailsResults = await w3.multicall({
    contracts: detailsCalls,
    allowFailure: true,
  })

  const proposalIds: bigint[] = []
  for (const result of detailsResults) {
    if (result?.status === 'success') {
      const [proposalId] = result.result as [bigint, Address[], bigint[], `0x${string}`[], `0x${string}`]
      proposalIds.push(proposalId)
    }
  }

  if (proposalIds.length === 0) {
    return { totalCount: total, proposals: [] }
  }

  const infoCalls = proposalIds.flatMap((proposalId) => [
    {
      address: addresses.governor,
      abi: GovernorAbi,
      functionName: 'state',
      args: [proposalId],
    },
    {
      address: addresses.governor,
      abi: GovernorAbi,
      functionName: 'proposalVotes',
      args: [proposalId],
    },
    {
      address: addresses.governor,
      abi: GovernorAbi,
      functionName: 'proposalProposer',
      args: [proposalId],
    },
    {
      address: addresses.governor,
      abi: GovernorAbi,
      functionName: 'proposalDeadline',
      args: [proposalId],
    },
  ])

  const infoResults = await w3.multicall({
    contracts: infoCalls,
    allowFailure: true,
  })

  const proposals: ProposalSummary[] = []

  for (let i = 0; i < proposalIds.length; i++) {
    const baseIndex = i * 4
    const proposalId = proposalIds[i]

    const stateResult = infoResults[baseIndex]
    const votesResult = infoResults[baseIndex + 1]
    const proposerResult = infoResults[baseIndex + 2]
    const deadlineResult = infoResults[baseIndex + 3]

    const state =
      stateResult?.status === 'success'
        ? (stateResult.result as number)
        : ProposalState.Pending

    const [againstVotes, forVotes, abstainVotes] =
      votesResult?.status === 'success'
        ? (votesResult.result as [bigint, bigint, bigint])
        : [0n, 0n, 0n]

    const proposer =
      proposerResult?.status === 'success'
        ? (proposerResult.result as Address)
        : ('0x0000000000000000000000000000000000000000' as Address)

    const deadline =
      deadlineResult?.status === 'success' ? (deadlineResult.result as bigint) : 0n

    proposals.push({
      proposalId: proposalId.toString(),
      index: startIndex - i,
      state: state as ProposalState,
      stateLabel: ProposalStateLabels[state as ProposalState] ?? 'Unknown',
      proposer,
      deadline,
      forVotes,
      againstVotes,
      abstainVotes,
    })
  }

  return {
    totalCount: total,
    proposals,
  }
}
