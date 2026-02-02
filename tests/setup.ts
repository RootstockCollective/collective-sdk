/**
 * Test setup and utilities
 */
import { vi } from 'vitest'
import type { W3LayerInstance, MulticallContractResult } from '@rsksmart/w3layer'
import type { PublicClient } from 'viem'

export interface MockW3Options {
  readContractValue?: unknown
  readContractValues?: unknown[]
  multicallResults?: MulticallContractResult[]
  balanceValue?: bigint
}

/**
 * Create a mock W3LayerInstance for testing
 */
export function createTestW3(options: MockW3Options = {}): W3LayerInstance {
  const {
    readContractValue = 0n,
    readContractValues = [],
    multicallResults = [],
    balanceValue = 0n,
  } = options

  let readCallIndex = 0
  let multicallCallIndex = 0

  return {
    chainId: 30,
    publicClient: {} as PublicClient,

    readContract: vi.fn().mockImplementation(() => {
      if (readContractValues.length > 0) {
        const value = readContractValues[readCallIndex] ?? readContractValue
        readCallIndex++
        return Promise.resolve(value)
      }
      return Promise.resolve(readContractValue)
    }),

    multicall: vi.fn().mockImplementation((params: { contracts: unknown[] }) => {
      if (multicallResults.length > 0) {
        const count = params.contracts.length
        const results = multicallResults.slice(multicallCallIndex, multicallCallIndex + count)
        multicallCallIndex += count

        while (results.length < count) {
          results.push({ status: 'success', result: 0n })
        }
        return Promise.resolve(results)
      }
      return Promise.resolve(
        params.contracts.map(() => ({ status: 'success' as const, result: 0n }))
      )
    }),

    simulateContract: vi.fn().mockResolvedValue({ success: true, result: undefined }),

    writeContract: vi.fn().mockResolvedValue({
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      wait: vi.fn().mockResolvedValue({
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 12345n,
        status: 'success' as const,
        gasUsed: 100000n,
      }),
    }),

    getBalance: vi.fn().mockResolvedValue(balanceValue),

    getLogs: vi.fn().mockResolvedValue([]),

    getBlock: vi.fn().mockResolvedValue({
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      number: 12345n,
    }),
  }
}
