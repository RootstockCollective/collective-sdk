import { describe, it, expect, vi } from 'vitest'
import { castVote, hasVoted, getProposalState } from '../../src/proposals/castVote'
import { ProposalState, VoteSupport } from '../../src/proposals/types'
import { createTestW3 } from '../setup'
import { mockAddresses, mockUserAddress, mockProposalId } from '../mocks'
import type { WalletClient } from 'viem'

describe('castVote', () => {
  const mockWalletClient = {
    getAddresses: vi.fn().mockResolvedValue([mockUserAddress]),
  } as unknown as WalletClient

  describe('hasVoted', () => {
    it('should return true when user has voted', async () => {
      const w3 = createTestW3({
        readContractValue: true,
      })

      const result = await hasVoted(w3, mockAddresses, mockProposalId, mockUserAddress)

      expect(result).toBe(true)
      expect(w3.readContract).toHaveBeenCalledWith({
        address: mockAddresses.governor,
        abi: expect.any(Array),
        functionName: 'hasVoted',
        args: [BigInt(mockProposalId), mockUserAddress],
      })
    })

    it('should return false when user has not voted', async () => {
      const w3 = createTestW3({
        readContractValue: false,
      })

      const result = await hasVoted(w3, mockAddresses, mockProposalId, mockUserAddress)

      expect(result).toBe(false)
    })
  })

  describe('getProposalState', () => {
    it('should return the proposal state', async () => {
      const w3 = createTestW3({
        readContractValue: ProposalState.Active,
      })

      const result = await getProposalState(w3, mockAddresses, mockProposalId)

      expect(result).toBe(ProposalState.Active)
    })

    it('should handle different proposal states', async () => {
      const w3 = createTestW3({
        readContractValue: ProposalState.Executed,
      })

      const result = await getProposalState(w3, mockAddresses, mockProposalId)

      expect(result).toBe(ProposalState.Executed)
    })
  })

  describe('castVote', () => {
    it('should cast a vote successfully', async () => {
      const w3 = createTestW3({
        readContractValues: [
          ProposalState.Active,
          false,
        ],
      })

      const result = await castVote(
        w3,
        mockAddresses,
        mockWalletClient,
        mockProposalId,
        VoteSupport.For
      )

      expect(result.hash).toBeDefined()
      expect(w3.writeContract).toHaveBeenCalledWith(
        mockWalletClient,
        expect.objectContaining({
          address: mockAddresses.governor,
          functionName: 'castVote',
          args: [BigInt(mockProposalId), VoteSupport.For],
        })
      )
    })

    it('should cast a vote with reason when provided', async () => {
      const w3 = createTestW3({
        readContractValues: [
          ProposalState.Active,
          false,
        ],
      })

      await castVote(
        w3,
        mockAddresses,
        mockWalletClient,
        mockProposalId,
        VoteSupport.Against,
        { reason: 'I disagree with this proposal' }
      )

      expect(w3.writeContract).toHaveBeenCalledWith(
        mockWalletClient,
        expect.objectContaining({
          functionName: 'castVoteWithReason',
          args: [BigInt(mockProposalId), VoteSupport.Against, 'I disagree with this proposal'],
        })
      )
    })

    it('should throw error when proposal is not active', async () => {
      const w3 = createTestW3({
        readContractValue: ProposalState.Pending,
      })

      await expect(
        castVote(w3, mockAddresses, mockWalletClient, mockProposalId, VoteSupport.For)
      ).rejects.toThrow('Cannot vote on proposal: state is Pending (must be Active)')
    })

    it('should throw error when user already voted', async () => {
      const w3 = createTestW3({
        readContractValues: [
          ProposalState.Active,
          true,
        ],
      })

      await expect(
        castVote(w3, mockAddresses, mockWalletClient, mockProposalId, VoteSupport.For)
      ).rejects.toThrow('User has already voted on this proposal')
    })

    it('should skip validation when skipValidation is true', async () => {
      const w3 = createTestW3()

      const result = await castVote(
        w3,
        mockAddresses,
        mockWalletClient,
        mockProposalId,
        VoteSupport.For,
        { skipValidation: true }
      )

      expect(result.hash).toBeDefined()
      expect(w3.readContract).not.toHaveBeenCalled()
    })

    it('should throw error when no wallet account available', async () => {
      const emptyWallet = {
        getAddresses: vi.fn().mockResolvedValue([]),
      } as unknown as WalletClient

      const w3 = createTestW3()

      await expect(
        castVote(w3, mockAddresses, emptyWallet, mockProposalId, VoteSupport.For, { skipValidation: true })
      ).rejects.toThrow('No account available in wallet client')
    })
  })
})
