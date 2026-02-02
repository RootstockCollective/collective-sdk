import { describe, it, expect, vi } from 'vitest'
import { claimRewards, getClaimableRewardsInfo } from '../../src/holdings/claimRewards'
import { createTestW3 } from '../setup'
import { mockAddresses, mockUserAddress, mockGaugeAddress } from '../mocks'
import type { WalletClient } from 'viem'

describe('claimRewards', () => {
  const mockWalletClient = {
    getAddresses: vi.fn().mockResolvedValue([mockUserAddress]),
  } as unknown as WalletClient

  describe('getClaimableRewardsInfo', () => {
    it('should return gauges with rewards for each token', async () => {
      const gauge1 = mockGaugeAddress
      const gauge2 = '0xdddddddddddddddddddddddddddddddddddddddd' as const

      const w3 = createTestW3({
        readContractValues: [
          2n,
          [gauge1, gauge2], // gauges
        ],
        // Gauge1: RIF=100, RBTC=50, USDRIF=0
        // Gauge2: RIF=0, RBTC=0, USDRIF=200
        multicallResults: [
          { status: 'success', result: 100000000000000000n }, // gauge1 RIF
          { status: 'success', result: 50000000000000000n },  // gauge1 RBTC
          { status: 'success', result: 0n },                  // gauge1 USDRIF
          { status: 'success', result: 0n },                  // gauge2 RIF
          { status: 'success', result: 0n },                  // gauge2 RBTC
          { status: 'success', result: 200000000000000000n }, // gauge2 USDRIF
        ],
      })

      const info = await getClaimableRewardsInfo(w3, mockAddresses, mockUserAddress)

      expect(info.rifGauges).toEqual([gauge1])
      expect(info.rbtcGauges).toEqual([gauge1])
      expect(info.usdrifGauges).toEqual([gauge2])
      expect(info.allGauges).toHaveLength(2)
      expect(info.hasRewards).toBe(true)
    })

    it('should return hasRewards = false when no rewards', async () => {
      const w3 = createTestW3({
        readContractValues: [
          1n,
          [mockGaugeAddress],
        ],
        multicallResults: [
          { status: 'success', result: 0n },
          { status: 'success', result: 0n },
          { status: 'success', result: 0n },
        ],
      })

      const info = await getClaimableRewardsInfo(w3, mockAddresses, mockUserAddress)

      expect(info.hasRewards).toBe(false)
      expect(info.allGauges).toHaveLength(0)
    })
  })

  describe('claimRewards', () => {
    it('should claim all rewards when token is "all"', async () => {
      const w3 = createTestW3({
        readContractValues: [
          1n,
          [mockGaugeAddress],
        ],
        multicallResults: [
          { status: 'success', result: 100000000000000000n }, // RIF
          { status: 'success', result: 0n },
          { status: 'success', result: 0n },
        ],
      })

      const result = await claimRewards(w3, mockAddresses, mockWalletClient, mockUserAddress, 'all')

      expect(result.hash).toBeDefined()
      expect(w3.writeContract).toHaveBeenCalledWith(
        mockWalletClient,
        expect.objectContaining({
          address: mockAddresses.backersManager,
          functionName: 'claimBackerRewards',
          args: [[mockGaugeAddress]],
        })
      )
    })

    it('should claim specific token when provided', async () => {
      const w3 = createTestW3({
        readContractValues: [
          1n,
          [mockGaugeAddress],
        ],
        multicallResults: [
          { status: 'success', result: 100000000000000000n }, // RIF
          { status: 'success', result: 0n },
          { status: 'success', result: 0n },
        ],
      })

      await claimRewards(w3, mockAddresses, mockWalletClient, mockUserAddress, 'rif')

      expect(w3.writeContract).toHaveBeenCalledWith(
        mockWalletClient,
        expect.objectContaining({
          functionName: 'claimBackerRewards',
          args: [mockAddresses.RIF, [mockGaugeAddress]],
        })
      )
    })

    it('should throw error when no rewards to claim', async () => {
      const w3 = createTestW3({
        readContractValues: [
          1n,
          [mockGaugeAddress],
        ],
        multicallResults: [
          { status: 'success', result: 0n },
          { status: 'success', result: 0n },
          { status: 'success', result: 0n },
        ],
      })

      await expect(
        claimRewards(w3, mockAddresses, mockWalletClient, mockUserAddress, 'rif')
      ).rejects.toThrow('No rif rewards to claim')
    })

    it('should wait for transaction confirmation', async () => {
      const w3 = createTestW3({
        readContractValues: [
          1n,
          [mockGaugeAddress],
        ],
        multicallResults: [
          { status: 'success', result: 100000000000000000n },
          { status: 'success', result: 0n },
          { status: 'success', result: 0n },
        ],
      })

      const result = await claimRewards(w3, mockAddresses, mockWalletClient, mockUserAddress)
      const receipt = await result.wait()

      expect(receipt.status).toBe('success')
      expect(receipt.blockNumber).toBeDefined()
    })
  })
})
