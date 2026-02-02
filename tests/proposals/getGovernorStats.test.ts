import { describe, it, expect } from 'vitest'
import { getGovernorStats } from '../../src/proposals/getGovernorStats'
import { ProposalState } from '../../src/proposals/types'
import { createTestW3 } from '../setup'
import { mockAddresses } from '../mocks'

describe('getGovernorStats', () => {
  it('should return governor statistics', async () => {
    const w3 = createTestW3({
      multicallResults: [
        { status: 'success', result: 10n },
        { status: 'success', result: 1000000000000000000n },
        { status: 'success', result: 4n },
        { status: 'success', result: 100n },
        ...Array(10).fill(null).map((_, i) => ({
          status: 'success' as const,
          result: [BigInt(i + 1), [], [], [], ''],
        })),
        { status: 'success', result: ProposalState.Active },
        { status: 'success', result: ProposalState.Active },
        ...Array(8).fill({ status: 'success' as const, result: ProposalState.Executed }),
      ],
    })

    const stats = await getGovernorStats(w3, mockAddresses)

    expect(stats.proposalCount).toBe(10)
    expect(stats.activeProposals).toBe(2)
    expect(stats.proposalThreshold.value).toBe(1000000000000000000n)
    expect(stats.proposalThreshold.symbol).toBe('stRIF')
    expect(stats.quorumPercentage).toBe(4)
  })

  it('should handle zero proposals', async () => {
    const w3 = createTestW3({
      multicallResults: [
        { status: 'success', result: 0n },
        { status: 'success', result: 1000000000000000000n },
        { status: 'success', result: 4n },
        { status: 'success', result: 100n },
      ],
    })

    const stats = await getGovernorStats(w3, mockAddresses)

    expect(stats.proposalCount).toBe(0)
    expect(stats.activeProposals).toBe(0)
  })

  it('should handle failed multicall responses', async () => {
    const w3 = createTestW3({
      multicallResults: [
        { status: 'failure', error: new Error('RPC error') },
        { status: 'success', result: 1000000000000000000n },
        { status: 'failure', error: new Error('RPC error') },
        { status: 'success', result: 100n },
      ],
    })

    const stats = await getGovernorStats(w3, mockAddresses)

    expect(stats.proposalCount).toBe(0)
    expect(stats.quorumPercentage).toBe(0)
  })

  it('should calculate quorum percentage correctly', async () => {
    const w3 = createTestW3({
      multicallResults: [
        { status: 'success', result: 0n },
        { status: 'success', result: 0n },
        { status: 'success', result: 15n },
        { status: 'success', result: 100n },
      ],
    })

    const stats = await getGovernorStats(w3, mockAddresses)

    expect(stats.quorumPercentage).toBe(15)
  })
})
