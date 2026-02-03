/**
 * BuilderRegistry ABI (partial - only functions needed for backing)
 */
export const BuilderRegistryAbi = [
  {
    type: 'function',
    name: 'getGaugesLength',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getGaugesInRange',
    inputs: [
      {
        name: 'start_',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'length_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address[]',
        internalType: 'address[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getGaugeAt',
    inputs: [
      {
        name: 'index_',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'gaugeToBuilder',
    inputs: [
      {
        name: 'gauge',
        type: 'address',
        internalType: 'contract GaugeRootstockCollective',
      },
    ],
    outputs: [
      {
        name: 'builder',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'builderToGauge',
    inputs: [
      {
        name: 'builder',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'gauge',
        type: 'address',
        internalType: 'contract GaugeRootstockCollective',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'builderState',
    inputs: [
      {
        name: 'builder',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'initialized',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'kycApproved',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'communityApproved',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'kycPaused',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'selfPaused',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'reserved',
        type: 'bytes7',
        internalType: 'bytes7',
      },
      {
        name: 'pausedReason',
        type: 'bytes20',
        internalType: 'bytes20',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'backerRewardPercentage',
    inputs: [
      {
        name: 'builder',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'previous',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'next',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'cooldownEndTime',
        type: 'uint128',
        internalType: 'uint128',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isBuilderOperational',
    inputs: [
      {
        name: 'builder_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRewardPercentageToApply',
    inputs: [
      {
        name: 'builder_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint64',
        internalType: 'uint64',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'communityApproveBuilder',
    inputs: [
      {
        name: 'builder_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revokeBuilderKYC',
    inputs: [
      {
        name: 'builder_',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const
