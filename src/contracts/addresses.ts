import type { Address } from 'viem'
import type { RootstockChainId } from '@rsksmart/w3layer'
import {
  getTokenAddresses,
  type TokenAddresses,
  type RootstockChainId as BaseChainId,
} from '@rsksmart/sdk-base'

/**
 * Collective-specific contract addresses
 */
export interface CollectiveContractAddresses {
  /** Backers Manager contract */
  backersManager: Address
  /** Builder Registry contract */
  builderRegistry: Address
  /** Governor contract (DAO governance) */
  governor: Address
  /** DAO Treasury contract (for proposal withdrawals) */
  treasury: Address
}

/**
 * Full contract addresses including tokens from sdk-base
 */
export interface ContractAddresses extends TokenAddresses, CollectiveContractAddresses {}

/**
 * Collective contract addresses for Rootstock Mainnet (chainId: 30)
 */
const mainnetCollectiveAddresses: CollectiveContractAddresses = {
  backersManager: '0x7995C48D987941291d8008695A4133E557a11530' as Address,
  builderRegistry: '0x8cb62c58AC3D1253c6467537FDDc563857eD76cb' as Address,
  governor: '0x71ac6ff904a17f50f2c07b693376ccc1c92627f0' as Address,
  treasury: '0x0E18C0d6d0a1db34Be68ad6847cB8835c3a6D5e1' as Address,
}

/**
 * Collective contract addresses for Rootstock Testnet (chainId: 31)
 */
const testnetCollectiveAddresses: CollectiveContractAddresses = {
  backersManager: '0xd520cb42c46115762c02e4340646c2051ca3406d' as Address,
  builderRegistry: '0x5fc1dd934ef2e6b5c4a433a3ec0a1326834b0f42' as Address,
  governor: '0x25b7eb94f76cc682a402da980e6599478a596379' as Address,
  treasury: '0xc4dacee263b0d1f2a09006dbc0170a4fda861b68' as Address,
}

/**
 * Get Collective-specific contract addresses for a chain
 */
function getCollectiveAddresses(chainId: RootstockChainId): CollectiveContractAddresses {
  switch (chainId) {
    case 30:
      return mainnetCollectiveAddresses
    case 31:
      return testnetCollectiveAddresses
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`)
  }
}

/**
 * Get all contract addresses (tokens from sdk-base + Collective-specific)
 */
export function getContractAddresses(chainId: RootstockChainId): ContractAddresses {
  const tokenAddresses = getTokenAddresses(chainId as BaseChainId)
  const collectiveAddresses = getCollectiveAddresses(chainId)

  return {
    ...tokenAddresses,
    ...collectiveAddresses,
  }
}

/**
 * Override contract addresses (useful for testing or custom deployments)
 */
export function createContractAddresses(
  chainId: RootstockChainId,
  overrides: Partial<ContractAddresses>
): ContractAddresses {
  const defaults = getContractAddresses(chainId)
  return {
    ...defaults,
    ...overrides,
  }
}
