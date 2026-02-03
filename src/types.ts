import type { Address } from 'viem'
import type { RootstockChainId } from '@rsksmart/w3layer'
import type { TokenAmount, Percentage } from '@rsksmart/sdk-base'
import type { ContractAddresses } from './contracts/addresses'
import type { BackedBuildersResult } from './backing/getBackedBuilders'
import type { TokenBalances, UnclaimedRewards, VotingPower } from './holdings'
import {
  ProposalState,
  VoteSupport,
  type GovernorStats,
  type ProposalsListResult,
  type Proposal,
  type VoteResult,
  type CanCreateProposalResult,
  type TreasuryTransferOptions,
  type BuilderWhitelistOptions,
  type BuilderRemovalOptions,
  type CustomProposalOptions,
  type ProposalData,
} from './proposals'
import type { WriteContractResult } from '@rsksmart/w3layer'

/**
 * Configuration for Collective SDK
 */
export interface CollectiveConfig {
  /** Chain ID: 30 for mainnet, 31 for testnet */
  chainId: RootstockChainId
  /** Custom RPC URL (optional) */
  rpcUrl?: string
  /** Override contract addresses (optional) */
  contractAddresses?: Partial<ContractAddresses>
}

/**
 * Available backing information for a user
 */
export interface AvailableForBacking {
  /** stRIF balance of the user */
  balance: TokenAmount
  /** Total amount already allocated by the user */
  totalAllocated: TokenAmount
  /** Available amount for new backing (balance - totalAllocated) */
  available: TokenAmount
}

/**
 * Total backing information for a user
 */
export interface TotalBacking {
  /** Total amount allocated across all builders */
  amount: TokenAmount
  /** Number of builders the user is backing */
  buildersCount: number
}

/**
 * Backers incentives statistics
 */
export interface BackersIncentives {
  /** Annual Backers Incentives percentage (estimated) */
  annualPercentage: Percentage
  /** Current cycle rewards in RIF */
  rewardsRif: TokenAmount
  /** Current cycle rewards in RBTC */
  rewardsNative: TokenAmount
  /** Current cycle rewards in USDRIF */
  rewardsUsdrif: TokenAmount
  /** Total potential reward for the cycle */
  totalPotentialReward: TokenAmount
}

/**
 * Builder state flags
 */
export interface BuilderStateFlags {
  initialized: boolean
  kycApproved: boolean
  communityApproved: boolean
  kycPaused: boolean
  selfPaused: boolean
}

/**
 * Backer reward percentage configuration
 */
export interface BackerRewardPercentage {
  /** Previous percentage */
  previous: bigint
  /** Next percentage (after cooldown) */
  next: bigint
  /** Cooldown end timestamp */
  cooldownEndTime: bigint
}

/**
 * Builder information
 */
export interface Builder {
  /** Builder wallet address */
  address: Address
  /** Builder's gauge contract address */
  gauge: Address
  /** Builder state flags */
  stateFlags: BuilderStateFlags
  /** Backer reward percentage configuration */
  backerRewardPct: BackerRewardPercentage
  /** Current reward percentage to apply */
  rewardPercentageToApply: bigint
  /** Whether the builder is operational (active and not paused) */
  isOperational: boolean
  /** Total allocation to this builder */
  totalAllocation: bigint
}

/**
 * Backing module interface
 */
export interface BackingModule {
  /** Get available balance for backing */
  getAvailableForBacking: (backerAddress: Address) => Promise<AvailableForBacking>
  /** Get total backing for a user */
  getTotalBacking: (backerAddress: Address) => Promise<TotalBacking>
  /** Get global backers incentives statistics */
  getBackersIncentives: () => Promise<BackersIncentives>
  /** Get list of all builders */
  getBuilders: () => Promise<Builder[]>
  /** Get a specific builder by address */
  getBuilder: (builderAddress: Address) => Promise<Builder | null>
  /** Get list of builders that a user is backing with their allocations */
  getBackedBuilders: (backerAddress: Address) => Promise<BackedBuildersResult>
}

/** Token type for claiming rewards */
export type ClaimableToken = 'rif' | 'rbtc' | 'usdrif' | 'all'

/** Result of claim rewards operation */
export interface ClaimRewardsResult {
  hash: `0x${string}`
  wait: (confirmations?: number) => Promise<{
    transactionHash: `0x${string}`
    blockNumber: bigint
    status: 'success' | 'reverted'
  }>
}

/** Info about claimable rewards */
export interface ClaimableRewardsInfo {
  rifGauges: Address[]
  rbtcGauges: Address[]
  usdrifGauges: Address[]
  allGauges: Address[]
  hasRewards: boolean
}

/**
 * Holdings module interface
 */
export interface HoldingsModule {
  /** Get token balances (RIF, stRIF, USDRIF, RBTC) for a user */
  getBalances: (userAddress: Address) => Promise<TokenBalances>
  /** Get unclaimed rewards for a backer */
  getUnclaimedRewards: (backerAddress: Address) => Promise<UnclaimedRewards>
  /** Get voting power (stRIF balance) for a user */
  getVotingPower: (userAddress: Address) => Promise<VotingPower>
  /** Get info about which gauges have claimable rewards */
  getClaimableRewardsInfo: (backerAddress: Address) => Promise<ClaimableRewardsInfo>

  /**
   * Claim backer rewards
   * @param walletClient - Viem WalletClient
   * @param backerAddress - Address of the backer
   * @param token - Which token to claim: 'rif', 'rbtc', 'usdrif', or 'all' (default)
   */
  claimRewards: (
    walletClient: import('viem').WalletClient,
    backerAddress: Address,
    token?: ClaimableToken
  ) => Promise<ClaimRewardsResult>
}

/**
 * Proposals module interface
 */
export interface ProposalsModule {
  /** Get Governor contract statistics (proposal count, threshold, quorum) */
  getStats: () => Promise<GovernorStats>
  /** Get a paginated list of proposals */
  getProposals: (options?: { offset?: number; limit?: number }) => Promise<ProposalsListResult>
  /** Get basic information about a specific proposal (fast) */
  getProposal: (proposalId: string | bigint) => Promise<Proposal | null>
  /** Get full details including description and actions (requires event log search) */
  getProposalDetails: (proposalId: string | bigint, options?: { fromBlock?: bigint }) => Promise<Proposal | null>
  /** Check if a user has already voted on a proposal */
  hasVoted: (proposalId: string | bigint, voterAddress: `0x${string}`) => Promise<boolean>
  /** Get the current state of a proposal */
  getProposalState: (proposalId: string | bigint) => Promise<ProposalState>
  /**
   * Cast a vote on a proposal
   * @param walletClient - Viem WalletClient (from wagmi, MetaMask, or private key)
   * @param proposalId - The proposal ID
   * @param support - VoteSupport.For, VoteSupport.Against, or VoteSupport.Abstain
   * @param options - Optional: reason for the vote, skip validation
   */
  castVote: (
    walletClient: import('viem').WalletClient,
    proposalId: string | bigint,
    support: VoteSupport,
    options?: { reason?: string; skipValidation?: boolean }
  ) => Promise<VoteResult>

  /**
   * Check if a user can create proposals (has enough voting power)
   * @param userAddress - Address to check
   */
  canCreateProposal: (userAddress: Address) => Promise<CanCreateProposalResult>

  /**
   * Check if a builder is already whitelisted
   * @param builderAddress - Builder address to check
   */
  isBuilderWhitelisted: (builderAddress: Address) => Promise<boolean>

  /**
   * Create a custom proposal
   * @param walletClient - Wallet for signing
   * @param proposal - Proposal data (targets, values, calldatas, description)
   */
  createProposal: (
    walletClient: import('viem').WalletClient,
    proposal: ProposalData
  ) => Promise<WriteContractResult>

  /**
   * Create a treasury transfer proposal
   * @param walletClient - Wallet for signing
   * @param options - Transfer options (token, recipient, amount, description)
   */
  createTreasuryTransferProposal: (
    walletClient: import('viem').WalletClient,
    options: TreasuryTransferOptions
  ) => Promise<WriteContractResult>

  /**
   * Create a builder whitelist proposal
   * @param walletClient - Wallet for signing
   * @param options - Whitelist options (builderAddress, description)
   */
  createBuilderWhitelistProposal: (
    walletClient: import('viem').WalletClient,
    options: BuilderWhitelistOptions
  ) => Promise<WriteContractResult>

  /**
   * Create a builder removal proposal
   * @param walletClient - Wallet for signing
   * @param options - Removal options (builderAddress, description)
   */
  createBuilderRemovalProposal: (
    walletClient: import('viem').WalletClient,
    options: BuilderRemovalOptions
  ) => Promise<WriteContractResult>

  /** Build a proposal object from raw params */
  buildProposal: (
    targets: Address[],
    values: bigint[],
    calldatas: `0x${string}`[],
    description: string
  ) => ProposalData

  /** Build a treasury transfer proposal object */
  buildTreasuryTransferProposal: (options: TreasuryTransferOptions) => ProposalData

  /** Build a builder whitelist proposal object */
  buildBuilderWhitelistProposal: (options: BuilderWhitelistOptions) => ProposalData

  /** Build a builder removal proposal object */
  buildBuilderRemovalProposal: (options: BuilderRemovalOptions) => ProposalData

  /** Build a custom proposal object */
  buildCustomProposal: (options: CustomProposalOptions) => ProposalData
}
