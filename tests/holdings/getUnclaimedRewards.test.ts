import { describe, it, expect } from 'vitest'
import { getUnclaimedRewards } from '../../src/holdings/getUnclaimedRewards'
import { createTestW3 } from '../setup'
import { mockAddresses, mockUserAddress, mockGaugeAddress } from '../mocks'

describe('getUnclaimedRewards', () => {
  it('should return unclaimed rewards from all gauges', async () => {
    const w3 = createTestW3({
      readContractValues: [
        2n,
        [mockGaugeAddress, '0xdddddddddddddddddddddddddddddddddddddddd'],
      ],
      multicallResults: [
        { status: 'success', result: 100000000000000000n },
        { status: 'success', result: 50000000000000000n },
        { status: 'success', result: 200000000000000000n },
        { status: 'success', result: 150000000000000000n },
        { status: 'success', result: 25000000000000000n },
        { status: 'success', result: 100000000000000000n },
      ],
    })

    const rewards = await getUnclaimedRewards(w3, mockAddresses, mockUserAddress)

    expect(rewards.rif.value).toBe(250000000000000000n)
    expect(rewards.rif.symbol).toBe('RIF')

    expect(rewards.rbtc.value).toBe(75000000000000000n)

    expect(rewards.usdrif.value).toBe(300000000000000000n)
  })

  it('should return zero rewards when no gauges exist', async () => {
    const w3 = createTestW3({
      readContractValue: 0n,
    })

    const rewards = await getUnclaimedRewards(w3, mockAddresses, mockUserAddress)

    expect(rewards.rif.value).toBe(0n)
    expect(rewards.rbtc.value).toBe(0n)
    expect(rewards.usdrif.value).toBe(0n)
    expect(w3.multicall).not.toHaveBeenCalled()
  })

  it('should handle partial failures gracefully', async () => {
    const w3 = createTestW3({
      readContractValues: [
        1n,
        [mockGaugeAddress],
      ],
      multicallResults: [
        { status: 'success', result: 100000000000000000n },
        { status: 'failure', error: new Error('RPC error') },
        { status: 'success', result: 200000000000000000n },
      ],
    })

    const rewards = await getUnclaimedRewards(w3, mockAddresses, mockUserAddress)

    expect(rewards.rif.value).toBe(100000000000000000n)
    expect(rewards.rbtc.value).toBe(0n)
    expect(rewards.usdrif.value).toBe(200000000000000000n)
  })

  it('should use COINBASE_ADDRESS for RBTC earned calls', async () => {
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

    await getUnclaimedRewards(w3, mockAddresses, mockUserAddress)

    expect(w3.multicall).toHaveBeenCalledWith({
      contracts: expect.arrayContaining([
        expect.objectContaining({
          args: [mockAddresses.COINBASE_ADDRESS, mockUserAddress],
        }),
      ]),
      allowFailure: true,
    })
  })
})
