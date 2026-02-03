import { type Address, type WalletClient, encodeFunctionData, keccak256, toHex, zeroAddress } from 'viem'
import type { W3LayerInstance, WriteContractResult } from '@rsksmart/w3layer'
import { toTokenAmount, TOKEN_DECIMALS, type TokenAmount } from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import {
  GovernorAbi,
  DAOTreasuryAbi,
  BuilderRegistryAbi,
  StRIFTokenAbi,
} from '../contracts/abis'

/**
 * Proposal parameters (raw format for the contract)
 */
export interface ProposalParams {
  /** Target contract addresses */
  targets: Address[]
  /** Values to send with each call (in wei) */
  values: bigint[]
  /** Encoded function calls */
  calldatas: `0x${string}`[]
  /** Proposal description */
  description: string
}

/**
 * Proposal with computed hash
 */
export interface Proposal extends ProposalParams {
  /** Keccak256 hash of the description */
  descriptionHash: `0x${string}`
}

/**
 * Result of checking if user can create a proposal
 */
export interface CanCreateProposalResult {
  /** Whether the user can create proposals */
  canCreate: boolean
  /** User's current voting power */
  votingPower: TokenAmount
  /** Required voting power threshold */
  threshold: TokenAmount
}

/**
 * Treasury transfer type
 */
export type TreasuryTransferToken = 'rbtc' | 'rif' | 'usdrif'

/**
 * Options for treasury transfer proposal
 */
export interface TreasuryTransferOptions {
  /** Token to transfer */
  token: TreasuryTransferToken
  /** Recipient address */
  recipient: Address
  /** Amount to transfer (as string, e.g., "100.5") */
  amount: string
  /** Proposal description */
  description: string
}

/**
 * Options for builder whitelist proposal
 */
export interface BuilderWhitelistOptions {
  /** Builder address to whitelist */
  builderAddress: Address
  /** Proposal description */
  description: string
}

/**
 * Options for builder removal proposal
 */
export interface BuilderRemovalOptions {
  /** Builder address to remove */
  builderAddress: Address
  /** Proposal description */
  description: string
}

/**
 * Options for custom proposal
 */
export interface CustomProposalOptions {
  /** Target contract addresses */
  targets: Address[]
  /** Values to send with each call (in wei) */
  values: bigint[]
  /** Encoded function calls */
  calldatas: `0x${string}`[]
  /** Proposal description */
  description: string
}

/**
 * Hash a proposal description
 */
export function hashDescription(description: string): `0x${string}` {
  return keccak256(toHex(description))
}

/**
 * Create a proposal object with computed hash
 */
export function buildProposal(
  targets: Address[],
  values: bigint[],
  calldatas: `0x${string}`[],
  description: string
): Proposal {
  return {
    targets,
    values,
    calldatas,
    description,
    descriptionHash: hashDescription(description),
  }
}

/**
 * Encode a Governor.relay() call
 * Used for executing functions through the Governor on other contracts
 */
export function encodeGovernorRelay(
  target: Address,
  value: bigint,
  data: `0x${string}`
): `0x${string}` {
  return encodeFunctionData({
    abi: GovernorAbi,
    functionName: 'relay',
    args: [target, value, data],
  })
}

/**
 * Parse amount string to bigint based on token decimals
 */
function parseAmount(amount: string, token: TreasuryTransferToken): bigint {
  const decimals = token === 'rbtc' ? 18 : TOKEN_DECIMALS[token.toUpperCase() as keyof typeof TOKEN_DECIMALS] ?? 18
  const [integer, decimal = ''] = amount.split('.')
  const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(integer + paddedDecimal)
}

/**
 * Build a treasury transfer proposal
 */
export function buildTreasuryTransferProposal(
  addresses: ContractAddresses,
  options: TreasuryTransferOptions
): Proposal {
  const { token, recipient, amount, description } = options
  const amountWei = parseAmount(amount, token)

  let calldata: `0x${string}`

  if (token === 'rbtc') {
    calldata = encodeFunctionData({
      abi: DAOTreasuryAbi,
      functionName: 'withdraw',
      args: [recipient, amountWei],
    })
  } else {
    const tokenAddress = token === 'rif' ? addresses.RIF : addresses.USDRIF
    calldata = encodeFunctionData({
      abi: DAOTreasuryAbi,
      functionName: 'withdrawERC20',
      args: [tokenAddress, recipient, amountWei],
    })
  }

  return buildProposal(
    [addresses.treasury],
    [0n],
    [calldata],
    description
  )
}

/**
 * Build a builder whitelist proposal
 */
export function buildBuilderWhitelistProposal(
  addresses: ContractAddresses,
  options: BuilderWhitelistOptions
): Proposal {
  const { builderAddress, description } = options

  const innerCalldata = encodeFunctionData({
    abi: BuilderRegistryAbi,
    functionName: 'communityApproveBuilder',
    args: [builderAddress],
  })

  const relayCalldata = encodeGovernorRelay(addresses.builderRegistry, 0n, innerCalldata)

  return buildProposal(
    [addresses.governor],
    [0n],
    [relayCalldata],
    description
  )
}

/**
 * Build a builder removal proposal
 */
export function buildBuilderRemovalProposal(
  addresses: ContractAddresses,
  options: BuilderRemovalOptions
): Proposal {
  const { builderAddress, description } = options

  const innerCalldata = encodeFunctionData({
    abi: BuilderRegistryAbi,
    functionName: 'revokeBuilderKYC',
    args: [builderAddress.toLowerCase() as Address],
  })

  const relayCalldata = encodeGovernorRelay(addresses.builderRegistry, 0n, innerCalldata)

  return buildProposal(
    [addresses.governor],
    [0n],
    [relayCalldata],
    description
  )
}

/**
 * Build a custom proposal with arbitrary targets and calldatas
 */
export function buildCustomProposal(options: CustomProposalOptions): Proposal {
  return buildProposal(
    options.targets,
    options.values,
    options.calldatas,
    options.description
  )
}

/**
 * Check if a user can create proposals
 * 
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param userAddress - User's address
 * @returns Whether the user can create proposals and their voting power
 */
export async function canCreateProposal(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  userAddress: Address
): Promise<CanCreateProposalResult> {
  const [votingPower, threshold] = await Promise.all([
    w3.readContract<bigint>({
      address: addresses.stRIF,
      abi: StRIFTokenAbi,
      functionName: 'getVotes',
      args: [userAddress],
    }),
    w3.readContract<bigint>({
      address: addresses.governor,
      abi: GovernorAbi,
      functionName: 'proposalThreshold',
    }),
  ])

  return {
    canCreate: votingPower >= threshold,
    votingPower: toTokenAmount(votingPower, TOKEN_DECIMALS.stRIF, 'stRIF'),
    threshold: toTokenAmount(threshold, TOKEN_DECIMALS.stRIF, 'stRIF'),
  }
}

/**
 * Check if a builder is already whitelisted
 */
export async function isBuilderWhitelisted(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  builderAddress: Address
): Promise<boolean> {
  const gauge = await w3.readContract<Address>({
    address: addresses.builderRegistry,
    abi: BuilderRegistryAbi,
    functionName: 'builderToGauge',
    args: [builderAddress],
  })

  return gauge !== zeroAddress
}

/**
 * Create a proposal on-chain
 * 
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param walletClient - Wallet client for signing
 * @param proposal - Proposal to create
 * @returns Transaction result
 */
export async function createProposal(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  walletClient: WalletClient,
  proposal: Proposal
): Promise<WriteContractResult> {
  return w3.writeContract(walletClient, {
    address: addresses.governor,
    abi: GovernorAbi,
    functionName: 'propose',
    args: [proposal.targets, proposal.values, proposal.calldatas, proposal.description],
  })
}

/**
 * Create a treasury transfer proposal
 * 
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param walletClient - Wallet client for signing
 * @param options - Treasury transfer options
 * @returns Transaction result
 */
export async function createTreasuryTransferProposal(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  walletClient: WalletClient,
  options: TreasuryTransferOptions
): Promise<WriteContractResult> {
  const proposal = buildTreasuryTransferProposal(addresses, options)
  return createProposal(w3, addresses, walletClient, proposal)
}

/**
 * Create a builder whitelist proposal
 * 
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param walletClient - Wallet client for signing
 * @param options - Builder whitelist options
 * @returns Transaction result
 */
export async function createBuilderWhitelistProposal(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  walletClient: WalletClient,
  options: BuilderWhitelistOptions
): Promise<WriteContractResult> {
  const isWhitelisted = await isBuilderWhitelisted(w3, addresses, options.builderAddress)
  if (isWhitelisted) {
    throw new Error('Builder is already whitelisted')
  }

  const proposal = buildBuilderWhitelistProposal(addresses, options)
  return createProposal(w3, addresses, walletClient, proposal)
}

/**
 * Create a builder removal proposal
 * 
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param walletClient - Wallet client for signing
 * @param options - Builder removal options
 * @returns Transaction result
 */
export async function createBuilderRemovalProposal(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  walletClient: WalletClient,
  options: BuilderRemovalOptions
): Promise<WriteContractResult> {
  const proposal = buildBuilderRemovalProposal(addresses, options)
  return createProposal(w3, addresses, walletClient, proposal)
}
