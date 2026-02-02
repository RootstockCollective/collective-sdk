import { describe, it, expect } from 'vitest'
import { getBalances } from '../../src/holdings/getBalances'
import { createTestW3 } from '../setup'
import { mockAddresses, mockUserAddress } from '../mocks'

describe('getBalances', () => {
  it('should return token balances for a user', async () => {
    const w3 = createTestW3({
      multicallResults: [
        { status: 'success', result: 1000000000000000000n },
        { status: 'success', result: 500000000000000000n },
        { status: 'success', result: 100000000000000000000n },
      ],
      balanceValue: 2000000000000000000n,
    })

    const balances = await getBalances(w3, mockAddresses, mockUserAddress)

    expect(balances.rif.value).toBe(1000000000000000000n)
    expect(balances.rif.symbol).toBe('RIF')
    expect(balances.stRIF.value).toBe(500000000000000000n)
    expect(balances.stRIF.symbol).toBe('stRIF')
    expect(balances.usdrif.value).toBe(100000000000000000000n)
    expect(balances.rbtc.value).toBe(2000000000000000000n)
  })

  it('should handle zero balances', async () => {
    const w3 = createTestW3({
      multicallResults: [
        { status: 'success', result: 0n },
        { status: 'success', result: 0n },
        { status: 'success', result: 0n },
      ],
      balanceValue: 0n,
    })

    const balances = await getBalances(w3, mockAddresses, mockUserAddress)

    expect(balances.rif.value).toBe(0n)
    expect(balances.stRIF.value).toBe(0n)
    expect(balances.usdrif.value).toBe(0n)
    expect(balances.rbtc.value).toBe(0n)
  })

  it('should handle failed multicall responses gracefully', async () => {
    const w3 = createTestW3({
      multicallResults: [
        { status: 'failure', error: new Error('RPC error') },
        { status: 'success', result: 500000000000000000n },
        { status: 'failure', error: new Error('RPC error') },
      ],
      balanceValue: 1000000000000000000n,
    })

    const balances = await getBalances(w3, mockAddresses, mockUserAddress)

    expect(balances.rif.value).toBe(0n)
    expect(balances.stRIF.value).toBe(500000000000000000n)
    expect(balances.usdrif.value).toBe(0n)
    expect(balances.rbtc.value).toBe(1000000000000000000n)
  })

  it('should call multicall with correct contract addresses', async () => {
    const w3 = createTestW3({
      multicallResults: [
        { status: 'success', result: 0n },
        { status: 'success', result: 0n },
        { status: 'success', result: 0n },
      ],
    })

    await getBalances(w3, mockAddresses, mockUserAddress)

    expect(w3.multicall).toHaveBeenCalledWith({
      contracts: expect.arrayContaining([
        expect.objectContaining({ address: mockAddresses.RIF }),
        expect.objectContaining({ address: mockAddresses.stRIF }),
        expect.objectContaining({ address: mockAddresses.USDRIF }),
      ]),
      allowFailure: true,
    })
  })
})
