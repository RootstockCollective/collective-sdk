/**
 * Mock addresses for testing
 */

import type { ContractAddresses } from '../../src/contracts/addresses'

export const mockAddresses: ContractAddresses = {
  RIF: '0x1111111111111111111111111111111111111111',
  stRIF: '0x2222222222222222222222222222222222222222',
  USDRIF: '0x3333333333333333333333333333333333333333',
  COINBASE_ADDRESS: '0xf7ab6cfaebbadfe8b5494022c4c6db776bd63b6b',

  backersManager: '0x4444444444444444444444444444444444444444',
  builderRegistry: '0x5555555555555555555555555555555555555555',
  governor: '0x6666666666666666666666666666666666666666',
}

export const mockUserAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const
export const mockBuilderAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const
export const mockGaugeAddress = '0xcccccccccccccccccccccccccccccccccccccccc' as const

export const mockProposalId = '12345678901234567890123456789012345678901234567890123456789012345678901234567890'
