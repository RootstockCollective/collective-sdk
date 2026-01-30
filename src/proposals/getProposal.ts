import type { Address } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import { toTokenAmount, TOKEN_DECIMALS, ZERO_ADDRESS } from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import { GovernorAbi } from '../contracts/abis'
import { ProposalState, ProposalStateLabels, type Proposal } from './types'

/**
 * Get detailed information about a specific proposal
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param proposalId - The proposal ID (as string or bigint)
 * @returns Full proposal details or null if not found
 */
export async function getProposal(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  proposalId: string | bigint
): Promise<Proposal | null> {
  const id = typeof proposalId === 'string' ? BigInt(proposalId) : proposalId

  const results = await w3.multicall({
    contracts: [
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'state',
        args: [id],
      },
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'proposalVotes',
        args: [id],
      },
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'proposalProposer',
        args: [id],
      },
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'proposalSnapshot',
        args: [id],
      },
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'proposalDeadline',
        args: [id],
      },
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'proposalDetails',
        args: [id],
      },
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'proposalEta',
        args: [id],
      },
      {
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'proposalNeedsQueuing',
        args: [id],
      },
    ],
    allowFailure: true,
  })

  if (results[0]?.status !== 'success') {
    return null
  }

  const state = results[0].result as number

  const [againstVotes, forVotes, abstainVotes] =
    results[1]?.status === 'success'
      ? (results[1].result as [bigint, bigint, bigint])
      : [0n, 0n, 0n]

  const proposer =
    results[2]?.status === 'success'
      ? (results[2].result as Address)
      : (ZERO_ADDRESS)

  const snapshotBlock =
    results[3]?.status === 'success' ? (results[3].result as bigint) : 0n

  const deadline =
    results[4]?.status === 'success' ? (results[4].result as bigint) : 0n

  const [targets, values, calldatas, descriptionHash] =
    results[5]?.status === 'success'
      ? (results[5].result as [Address[], bigint[], `0x${string}`[], `0x${string}`])
      : [[] as Address[], [] as bigint[], [] as `0x${string}`[], '0x' as `0x${string}`]

  const eta = results[6]?.status === 'success' ? (results[6].result as bigint) : 0n

  const needsQueuing =
    results[7]?.status === 'success' ? (results[7].result as boolean) : false

  let quorum = 0n
  if (snapshotBlock > 0n) {
    try {
      quorum = await w3.readContract<bigint>({
        address: addresses.governor,
        abi: GovernorAbi,
        functionName: 'quorum',
        args: [snapshotBlock],
      })
    } catch {
      // Quorum might not be available if block is too recent
    }
  }

  const totalVotes = forVotes + againstVotes + abstainVotes
  const quorumReached = forVotes >= quorum

  return {
    proposalId: id.toString(),
    proposer,
    state: state as ProposalState,
    stateLabel: ProposalStateLabels[state as ProposalState] ?? 'Unknown',
    snapshotBlock,
    deadline,
    votes: {
      forVotes: toTokenAmount(forVotes, TOKEN_DECIMALS.stRIF, 'stRIF'),
      againstVotes: toTokenAmount(againstVotes, TOKEN_DECIMALS.stRIF, 'stRIF'),
      abstainVotes: toTokenAmount(abstainVotes, TOKEN_DECIMALS.stRIF, 'stRIF'),
      totalVotes: toTokenAmount(totalVotes, TOKEN_DECIMALS.stRIF, 'stRIF'),
    },
    quorum: toTokenAmount(quorum, TOKEN_DECIMALS.stRIF, 'stRIF'),
    quorumReached,
    targets,
    values,
    calldatas,
    descriptionHash,
    eta,
    needsQueuing,
  }
}
