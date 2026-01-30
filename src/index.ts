/**
 * @rsksmart/collective
 *
 * Rootstock Collective DAO SDK
 * Interact with the Collective DAO protocol for backing, governance, and rewards.
 */

export { CollectiveSDK, createCollective } from './collective'

export type {
  CollectiveConfig,
  AvailableForBacking,
  TotalBacking,
  BackersIncentives,
  Builder,
  BuilderStateFlags,
  BackerRewardPercentage,
  BackingModule,
  HoldingsModule,
  ProposalsModule,
} from './types'

export type { BackedBuilder, BackedBuildersResult } from './backing/getBackedBuilders'

export type { TokenBalances, UnclaimedRewards, VotingPower } from './holdings'

export {
  ProposalState,
  ProposalStateLabels,
  ProposalCategory,
  type GovernorStats,
  type ProposalVotes,
  type ProposalBasic,
  type Proposal,
  type ProposalSummary,
  type ProposalsListResult,
  type ProposalAction,
} from './proposals'

export {
  getContractAddresses,
  createContractAddresses,
  type ContractAddresses,
} from './contracts/addresses'

export type { Address } from 'viem'
export type { TokenAmount, Percentage } from '@rsksmart/sdk-base'
export type { RootstockChainId } from '@rsksmart/w3layer'
