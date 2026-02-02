import { describe, it, expect } from 'vitest'
import { getBuilders, getBuilder } from '../../src/backing/getBuilders'
import { createTestW3 } from '../setup'
import { mockAddresses, mockBuilderAddress, mockGaugeAddress } from '../mocks'

describe('getBuilders', () => {
  it('should return list of builders', async () => {
    const w3 = createTestW3({
      readContractValues: [
        2n,
        [mockGaugeAddress, '0xdddddddddddddddddddddddddddddddddddddddd'],
      ],
      multicallResults: [
        { status: 'success', result: mockBuilderAddress },
        { status: 'success', result: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' },
        { status: 'success', result: [true, true, true, false, false, '', ''] },
        { status: 'success', result: [true, true, true, false, false, '', ''] },
        { status: 'success', result: [500n, 500n, 0n] },
        { status: 'success', result: [1000n, 1000n, 0n] },
        { status: 'success', result: 500n },
        { status: 'success', result: 1000n },
        { status: 'success', result: true },
        { status: 'success', result: true },
        { status: 'success', result: 1000000000000000000n },
        { status: 'success', result: 2000000000000000000n },
      ],
    })

    const builders = await getBuilders(w3, mockAddresses)

    expect(builders).toHaveLength(2)
    expect(builders[0].address).toBe(mockBuilderAddress)
    expect(builders[0].gauge).toBe(mockGaugeAddress)
    expect(builders[0].isOperational).toBe(true)
  })

  it('should return empty array when no builders', async () => {
    const w3 = createTestW3({
      readContractValue: 0n,
    })

    const builders = await getBuilders(w3, mockAddresses)

    expect(builders).toHaveLength(0)
  })
})

describe('getBuilder', () => {
  it('should return builder details for valid address', async () => {
    const w3 = createTestW3({
      readContractValues: [
        mockGaugeAddress,
        [true, true, true, false, false, '', ''],
        [750n, 750n, 0n],
        750n,
        true,
        5000000000000000000n,
      ],
    })

    const builder = await getBuilder(w3, mockAddresses, mockBuilderAddress)

    expect(builder).not.toBeNull()
    expect(builder?.address).toBe(mockBuilderAddress)
    expect(builder?.gauge).toBe(mockGaugeAddress)
    expect(builder?.isOperational).toBe(true)
  })

  it('should return null for non-existent builder', async () => {
    const w3 = createTestW3({
      readContractValue: '0x0000000000000000000000000000000000000000',
    })

    const builder = await getBuilder(w3, mockAddresses, mockBuilderAddress)

    expect(builder).toBeNull()
  })
})
