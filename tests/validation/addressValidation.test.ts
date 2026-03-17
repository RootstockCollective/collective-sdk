import { describe, it, expect } from 'vitest'
import { getAvailableForBacking } from '../../src/backing/getAvailableForBacking'
import { getTotalBacking } from '../../src/backing/getTotalBacking'
import { getBackedBuilders } from '../../src/backing/getBackedBuilders'
import { getBuilder } from '../../src/backing/getBuilders'
import { getBalances } from '../../src/holdings/getBalances'
import { getUnclaimedRewards } from '../../src/holdings/getUnclaimedRewards'
import { getVotingPower } from '../../src/holdings/getVotingPower'
import { getClaimableRewardsInfo } from '../../src/holdings/claimRewards'
import { getDetailedRewardsList } from '../../src/holdings/getDetailedRewardsList'
import { hasVoted } from '../../src/proposals/castVote'
import { canCreateProposal, isBuilderWhitelisted } from '../../src/proposals/createProposal'
import { createTestW3 } from '../setup'
import { mockAddresses } from '../mocks'

const INVALID_ADDRESS = 'not-a-valid-address' as `0x${string}`
const SHORT_ADDRESS = '0x1234' as `0x${string}`

describe('Address validation across all modules', () => {
  describe('Backing module', () => {
    it('getAvailableForBacking rejects invalid address', async () => {
      const w3 = createTestW3()
      await expect(getAvailableForBacking(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('getAvailableForBacking rejects short address', async () => {
      const w3 = createTestW3()
      await expect(getAvailableForBacking(w3, mockAddresses, SHORT_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('getTotalBacking rejects invalid address', async () => {
      const w3 = createTestW3()
      await expect(getTotalBacking(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('getBackedBuilders rejects invalid address', async () => {
      const w3 = createTestW3()
      await expect(getBackedBuilders(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('getBuilder rejects invalid address', async () => {
      const w3 = createTestW3()
      await expect(getBuilder(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('getBuilder rejects short address', async () => {
      const w3 = createTestW3()
      await expect(getBuilder(w3, mockAddresses, SHORT_ADDRESS)).rejects.toThrow('Invalid address')
    })
  })

  describe('Holdings module', () => {
    it('getBalances rejects invalid address', async () => {
      const w3 = createTestW3()
      await expect(getBalances(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('getUnclaimedRewards rejects invalid address', async () => {
      const w3 = createTestW3()
      await expect(getUnclaimedRewards(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('getVotingPower rejects invalid address', async () => {
      const w3 = createTestW3()
      await expect(getVotingPower(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('getClaimableRewardsInfo rejects invalid address', async () => {
      const w3 = createTestW3()
      await expect(getClaimableRewardsInfo(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('getDetailedRewardsList rejects invalid address', async () => {
      const w3 = createTestW3()
      await expect(getDetailedRewardsList(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('getDetailedRewardsList rejects short address', async () => {
      const w3 = createTestW3()
      await expect(getDetailedRewardsList(w3, mockAddresses, SHORT_ADDRESS)).rejects.toThrow('Invalid address')
    })
  })

  describe('Proposals module', () => {
    it('hasVoted rejects invalid voter address', async () => {
      const w3 = createTestW3()
      await expect(hasVoted(w3, mockAddresses, '123', INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('canCreateProposal rejects invalid user address', async () => {
      const w3 = createTestW3()
      await expect(canCreateProposal(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })

    it('isBuilderWhitelisted rejects invalid builder address', async () => {
      const w3 = createTestW3()
      await expect(isBuilderWhitelisted(w3, mockAddresses, INVALID_ADDRESS)).rejects.toThrow('Invalid address')
    })
  })
})
