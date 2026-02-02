import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CollectiveSDK, createCollective } from '../src/collective'

vi.mock('@rsksmart/w3layer', () => ({
  createW3Layer: vi.fn((config) => ({
    chainId: config.chainId,
    publicClient: {},
    readContract: vi.fn().mockResolvedValue(0n),
    multicall: vi.fn().mockResolvedValue([]),
    simulateContract: vi.fn().mockResolvedValue({ success: true }),
    writeContract: vi.fn().mockResolvedValue({
      hash: '0x1234',
      wait: vi.fn().mockResolvedValue({ status: 'success' }),
    }),
    getBalance: vi.fn().mockResolvedValue(0n),
    getLogs: vi.fn().mockResolvedValue([]),
    getBlock: vi.fn().mockResolvedValue({ timestamp: 0n, number: 0n }),
  })),
}))

describe('CollectiveSDK', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should create SDK instance with mainnet config', () => {
      const sdk = new CollectiveSDK({ chainId: 30 })

      expect(sdk.chainId).toBe(30)
      expect(sdk.contractAddresses).toBeDefined()
      expect(sdk.contractAddresses.backersManager).toBeDefined()
      expect(sdk.contractAddresses.builderRegistry).toBeDefined()
      expect(sdk.contractAddresses.governor).toBeDefined()
    })

    it('should create SDK instance with testnet config', () => {
      const sdk = new CollectiveSDK({ chainId: 31 })

      expect(sdk.chainId).toBe(31)
    })

    it('should allow custom RPC URL', () => {
      const sdk = new CollectiveSDK({
        chainId: 30,
        rpcUrl: 'https://custom-rpc.example.com',
      })

      expect(sdk.chainId).toBe(30)
    })

    it('should allow custom contract addresses', () => {
      const customAddress = '0x1234567890123456789012345678901234567890' as const
      const sdk = new CollectiveSDK({
        chainId: 30,
        contractAddresses: {
          backersManager: customAddress,
        },
      })

      expect(sdk.contractAddresses.backersManager).toBe(customAddress)
    })
  })

  describe('createCollective factory function', () => {
    it('should create SDK instance', () => {
      const sdk = createCollective({ chainId: 30 })

      expect(sdk).toBeInstanceOf(CollectiveSDK)
      expect(sdk.chainId).toBe(30)
    })
  })

  describe('modules', () => {
    it('should have backing module', () => {
      const sdk = new CollectiveSDK({ chainId: 30 })

      expect(sdk.backing).toBeDefined()
      expect(typeof sdk.backing.getAvailableForBacking).toBe('function')
      expect(typeof sdk.backing.getTotalBacking).toBe('function')
      expect(typeof sdk.backing.getBackersIncentives).toBe('function')
      expect(typeof sdk.backing.getBuilders).toBe('function')
      expect(typeof sdk.backing.getBuilder).toBe('function')
      expect(typeof sdk.backing.getBackedBuilders).toBe('function')
    })

    it('should have holdings module', () => {
      const sdk = new CollectiveSDK({ chainId: 30 })

      expect(sdk.holdings).toBeDefined()
      expect(typeof sdk.holdings.getBalances).toBe('function')
      expect(typeof sdk.holdings.getUnclaimedRewards).toBe('function')
      expect(typeof sdk.holdings.getVotingPower).toBe('function')
      expect(typeof sdk.holdings.getClaimableRewardsInfo).toBe('function')
      expect(typeof sdk.holdings.claimRewards).toBe('function')
    })

    it('should have proposals module', () => {
      const sdk = new CollectiveSDK({ chainId: 30 })

      expect(sdk.proposals).toBeDefined()
      expect(typeof sdk.proposals.getStats).toBe('function')
      expect(typeof sdk.proposals.getProposals).toBe('function')
      expect(typeof sdk.proposals.getProposal).toBe('function')
      expect(typeof sdk.proposals.getProposalDetails).toBe('function')
      expect(typeof sdk.proposals.hasVoted).toBe('function')
      expect(typeof sdk.proposals.getProposalState).toBe('function')
      expect(typeof sdk.proposals.castVote).toBe('function')
    })
  })

  describe('w3layer access', () => {
    it('should expose w3layer instance', () => {
      const sdk = new CollectiveSDK({ chainId: 30 })

      expect(sdk.w3layer).toBeDefined()
      expect(sdk.w3layer.chainId).toBe(30)
    })
  })
})
