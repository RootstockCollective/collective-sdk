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
}

/**
 * Collective contract addresses for Rootstock Testnet (chainId: 31)
 */
const testnetCollectiveAddresses: CollectiveContractAddresses = {
  backersManager: '0x70AC0FE4F8BCA42Aa7e713E1EDA2E8166d0f8Ed8' as Address,
  builderRegistry: '0xad125E6D5C3B84329fa2466A8A6955F67906F4b2' as Address,
  governor: '0xB1A39B8f57A55d1429324EEb1564122806eb297F' as Address,
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
