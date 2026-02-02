import { describe, it, expect } from 'vitest'
import { getVotingPower } from '../../src/holdings/getVotingPower'
import { createTestW3 } from '../setup'
import { mockAddresses, mockUserAddress } from '../mocks'

describe('getVotingPower', () => {
  it('should return voting power based on stRIF balance', async () => {
    const w3 = createTestW3({
      readContractValue: 5000000000000000000n,
    })

    const votingPower = await getVotingPower(w3, mockAddresses, mockUserAddress)

    expect(votingPower.amount.value).toBe(5000000000000000000n)
    expect(votingPower.amount.symbol).toBe('stRIF')
    expect(votingPower.hasVotingPower).toBe(true)
  })

  it('should return hasVotingPower = false when balance is zero', async () => {
    const w3 = createTestW3({
      readContractValue: 0n,
    })

    const votingPower = await getVotingPower(w3, mockAddresses, mockUserAddress)

    expect(votingPower.amount.value).toBe(0n)
    expect(votingPower.hasVotingPower).toBe(false)
  })

  it('should call readContract with correct stRIF address', async () => {
    const w3 = createTestW3({
      readContractValue: 0n,
    })

    await getVotingPower(w3, mockAddresses, mockUserAddress)

    expect(w3.readContract).toHaveBeenCalledWith({
      address: mockAddresses.stRIF,
      abi: expect.any(Array),
      functionName: 'balanceOf',
      args: [mockUserAddress],
    })
  })

  it('should format the amount correctly', async () => {
    const w3 = createTestW3({
      readContractValue: 100000000000000000000n,
    })

    const votingPower = await getVotingPower(w3, mockAddresses, mockUserAddress)

    expect(votingPower.amount.formatted).toBe('100')
  })
})
