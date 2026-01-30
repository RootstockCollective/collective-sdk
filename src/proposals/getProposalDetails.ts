import type { Address } from 'viem'
import { parseEventLogs } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import type { ContractAddresses } from '../contracts/addresses'
import { GovernorAbi } from '../contracts/abis'
import { getProposal } from './getProposal'
import type { Proposal } from './types'
import {
  parseProposalDescription,
  extractDiscourseUrl,
  determineProposalCategory,
  parseProposalActions,
} from './utils'

const BLOCKSCOUT_URLS: Record<number, string> = {
  30: 'https://rootstock.blockscout.com',
  31: 'https://rootstock-testnet.blockscout.com',
}

const PROPOSAL_CREATED_TOPIC = '0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0'

interface BlockscoutLog {
  address: string
  blockNumber: string
  data: string
  logIndex: string
  timeStamp: string
  transactionHash: string
  transactionIndex: string
  topics: string[]
}

interface BlockscoutResponse {
  message: string
  status: string
  result: BlockscoutLog[]
}

/**
 * Fetch proposal event from Blockscout API
 */
async function fetchProposalFromBlockscout(
  chainId: number,
  governorAddress: string,
  proposalId: bigint
): Promise<{ description: string; blockNumber: bigint; timestamp: number } | null> {
  const baseUrl = BLOCKSCOUT_URLS[chainId]
  if (!baseUrl) {
    throw new Error(`Blockscout URL not configured for chain ${chainId}`)
  }

  const params = new URLSearchParams({
    module: 'logs',
    action: 'getLogs',
    address: governorAddress.toLowerCase(),
    topic0: PROPOSAL_CREATED_TOPIC,
    fromBlock: '0',
    toBlock: 'latest',
  })

  const response = await fetch(`${baseUrl}/api?${params}`)
  if (!response.ok) {
    throw new Error(`Blockscout API error: ${response.status}`)
  }

  const data: BlockscoutResponse = await response.json()

  if (data.status !== '1' || !data.result || data.result.length === 0) {
    return null
  }

  // Convert to viem logs and parse
  const viemLogs = data.result.map((log) => ({
    address: log.address as Address,
    blockHash: null,
    blockNumber: BigInt(log.blockNumber),
    data: log.data as `0x${string}`,
    logIndex: Number(log.logIndex),
    transactionHash: log.transactionHash as `0x${string}`,
    transactionIndex: Number(log.transactionIndex),
    removed: false,
    topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
  }))

  const parsedLogs = parseEventLogs({
    abi: GovernorAbi,
    logs: viemLogs,
    eventName: 'ProposalCreated',
  })

  const matchingLog = parsedLogs.find((l) => l.args.proposalId === proposalId)
  if (!matchingLog) {
    return null
  }

  const originalLogIndex = parsedLogs.indexOf(matchingLog)
  const originalLog = data.result[originalLogIndex]

  return {
    description: matchingLog.args.description,
    blockNumber: matchingLog.blockNumber ?? 0n,
    timestamp: originalLog?.timeStamp ? Number(originalLog.timeStamp) : 0,
  }
}

/**
 * Get detailed information about a proposal including description and parsed actions
 *
 * This function uses Blockscout API to fetch the ProposalCreated event logs
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param proposalId - The proposal ID
 * @param _options - Optional parameters (reserved for future use)
 * @returns Full proposal details or null if not found
 */
export async function getProposalDetails(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  proposalId: string | bigint,
  _options: {
    /** Block range to search for the event (currently unused - Blockscout searches all blocks) */
    fromBlock?: bigint
  } = {}
): Promise<Proposal | null> {
  const proposal = await getProposal(w3, addresses, proposalId)

  if (!proposal) {
    return null
  }

  try {
    const id = typeof proposalId === 'string' ? BigInt(proposalId) : proposalId

    const eventData = await fetchProposalFromBlockscout(
      w3.chainId,
      addresses.governor,
      id
    )

    if (eventData) {
      const { description } = eventData
      const { title, body } = parseProposalDescription(description)
      const discussionUrl = extractDiscourseUrl(description)
      const category = determineProposalCategory(description, proposal.calldatas)
      const actions = parseProposalActions(proposal.targets, proposal.values, proposal.calldatas)

      return {
        ...proposal,
        title,
        description: body,
        category,
        discussionUrl,
        createdAt: eventData.timestamp,
        createdAtBlock: eventData.blockNumber,
        actions,
      }
    }
  } catch (error) {
    // TODO: decide whether it is necessary to throw error (if so then also perhaps the function name `tryDecode` is misleading).
    console.warn('Could not fetch ProposalCreated event from Blockscout:', error)
  }
  return proposal
}
