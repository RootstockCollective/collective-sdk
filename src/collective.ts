import type { Address } from 'viem'
import { createW3Layer, type W3LayerInstance } from '@rsksmart/w3layer'
import { createLogger, type Logger } from '@rsksmart/sdk-base'
import {
  getContractAddresses,
  createContractAddresses,
  type ContractAddresses,
} from './contracts/addresses'
import {
  getAvailableForBacking,
  getTotalBacking,
  getBackersIncentives,
  getBuilders,
  getBuilder,
  getBackedBuilders,
  type BackedBuildersResult,
} from './backing'
import {
  getBalances,
  getUnclaimedRewards,
  getVotingPower,
  type TokenBalances,
  type UnclaimedRewards,
  type VotingPower,
} from './holdings'
import {
  getGovernorStats,
  getProposals,
  getProposal,
  getProposalDetails,
  type GovernorStats,
  type ProposalsListResult,
  type Proposal,
} from './proposals'
import type {
  CollectiveConfig,
  BackingModule,
  HoldingsModule,
  ProposalsModule,
  AvailableForBacking,
  TotalBacking,
  BackersIncentives,
  Builder,
} from './types'

/**
 * Rootstock Collective SDK
 *
 * Main entry point for interacting with the Collective DAO protocol.
 *
 * @example
 * ```ts
 * import { CollectiveSDK } from '@rsksmart/collective'
 *
 * const sdk = new CollectiveSDK({ chainId: 30 })
 *
 * // Get available balance for backing
 * const available = await sdk.backing.getAvailableForBacking('0x...')
 *
 * // Get list of builders
 * const builders = await sdk.backing.getBuilders()
 * ```
 */
export class CollectiveSDK {
  private readonly w3: W3LayerInstance
  private readonly addresses: ContractAddresses
  private readonly logger: Logger

  /**
   * Backing module - functions related to backing builders
   */
  public readonly backing: BackingModule

  /**
   * Holdings module - functions related to user balances and rewards
   */
  public readonly holdings: HoldingsModule

  /**
   * Proposals module - functions related to DAO governance proposals
   */
  public readonly proposals: ProposalsModule

  constructor(config: CollectiveConfig) {
    this.logger = createLogger({ prefix: '[Collective]' })
    this.logger.debug('Initializing CollectiveSDK', { chainId: config.chainId })

    this.w3 = createW3Layer({
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
    })

    this.addresses = config.contractAddresses
      ? createContractAddresses(config.chainId, config.contractAddresses)
      : getContractAddresses(config.chainId)

    this.backing = this.createBackingModule()
    this.holdings = this.createHoldingsModule()
    this.proposals = this.createProposalsModule()

    this.logger.info('CollectiveSDK initialized', { chainId: config.chainId })
  }

  /**
   * Create the backing module with bound methods
   */
  private createBackingModule(): BackingModule {
    return {
      getAvailableForBacking: (backerAddress: Address): Promise<AvailableForBacking> =>
        getAvailableForBacking(this.w3, this.addresses, backerAddress),

      getTotalBacking: (backerAddress: Address): Promise<TotalBacking> =>
        getTotalBacking(this.w3, this.addresses, backerAddress),

      getBackersIncentives: (): Promise<BackersIncentives> =>
        getBackersIncentives(this.w3, this.addresses),

      getBuilders: (): Promise<Builder[]> => getBuilders(this.w3, this.addresses),

      getBuilder: (builderAddress: Address): Promise<Builder | null> =>
        getBuilder(this.w3, this.addresses, builderAddress),

      getBackedBuilders: (backerAddress: Address): Promise<BackedBuildersResult> =>
        getBackedBuilders(this.w3, this.addresses, backerAddress),
    }
  }

  /**
   * Create the holdings module with bound methods
   */
  private createHoldingsModule(): HoldingsModule {
    return {
      getBalances: (userAddress: Address): Promise<TokenBalances> =>
        getBalances(this.w3, this.addresses, userAddress),

      getUnclaimedRewards: (backerAddress: Address): Promise<UnclaimedRewards> =>
        getUnclaimedRewards(this.w3, this.addresses, backerAddress),

      getVotingPower: (userAddress: Address): Promise<VotingPower> =>
        getVotingPower(this.w3, this.addresses, userAddress),
    }
  }

  /**
   * Create the proposals module with bound methods
   */
  private createProposalsModule(): ProposalsModule {
    return {
      getStats: (): Promise<GovernorStats> =>
        getGovernorStats(this.w3, this.addresses),

      getProposals: (options?: { offset?: number; limit?: number }): Promise<ProposalsListResult> =>
        getProposals(this.w3, this.addresses, options),

      getProposal: (proposalId: string | bigint): Promise<Proposal | null> =>
        getProposal(this.w3, this.addresses, proposalId),

      getProposalDetails: (proposalId: string | bigint, options?: { fromBlock?: bigint }): Promise<Proposal | null> =>
        getProposalDetails(this.w3, this.addresses, proposalId, options),
    }
  }

  /**
   * Get the current chain ID
   */
  get chainId(): number {
    return this.w3.chainId
  }

  /**
   * Get the contract addresses being used
   */
  get contractAddresses(): ContractAddresses {
    return { ...this.addresses }
  }

  /**
   * Get the underlying W3Layer instance for advanced usage
   */
  get w3layer(): W3LayerInstance {
    return this.w3
  }
}

/**
 * Create a new CollectiveSDK instance
 *
 * @param config - SDK configuration
 * @returns CollectiveSDK instance
 *
 * @example
 * ```ts
 * const sdk = createCollective({ chainId: 30 })
 * ```
 */
export function createCollective(config: CollectiveConfig): CollectiveSDK {
  return new CollectiveSDK(config)
}
