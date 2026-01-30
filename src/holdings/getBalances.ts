import type { Address } from 'viem'
import type { W3LayerInstance } from '@rsksmart/w3layer'
import { toTokenAmount, TOKEN_DECIMALS, type TokenAmount } from '@rsksmart/sdk-base'
import type { ContractAddresses } from '../contracts/addresses'
import { ERC20Abi } from '../contracts/abis'

/**
 * Token balances for a user
 */
export interface TokenBalances {
  /** RIF token balance */
  rif: TokenAmount
  /** stRIF token balance (voting power) */
  stRIF: TokenAmount
  /** USDRIF stablecoin balance */
  usdrif: TokenAmount
  /** Native RBTC balance */
  rbtc: TokenAmount
}

/**
 * Get token balances for a user address
 *
 * @param w3 - W3Layer instance
 * @param addresses - Contract addresses
 * @param userAddress - Address to check balances for
 * @returns Token balances
 */
export async function getBalances(
  w3: W3LayerInstance,
  addresses: ContractAddresses,
  userAddress: Address
): Promise<TokenBalances> {
  const [tokenResults, rbtcBalance] = await Promise.all([
    w3.multicall({
      contracts: [
        {
          address: addresses.RIF,
          abi: ERC20Abi,
          functionName: 'balanceOf',
          args: [userAddress],
        },
        {
          address: addresses.stRIF,
          abi: ERC20Abi,
          functionName: 'balanceOf',
          args: [userAddress],
        },
        {
          address: addresses.USDRIF,
          abi: ERC20Abi,
          functionName: 'balanceOf',
          args: [userAddress],
        },
      ],
      allowFailure: true,
    }),
    w3.getBalance(userAddress),
  ])

  const rifBalance =
    tokenResults[0]?.status === 'success' ? (tokenResults[0].result as bigint) : 0n
  const stRifBalance =
    tokenResults[1]?.status === 'success' ? (tokenResults[1].result as bigint) : 0n
  const usdrifBalance =
    tokenResults[2]?.status === 'success' ? (tokenResults[2].result as bigint) : 0n

  return {
    rif: toTokenAmount(rifBalance, TOKEN_DECIMALS.RIF, 'RIF'),
    stRIF: toTokenAmount(stRifBalance, TOKEN_DECIMALS.stRIF, 'stRIF'),
    usdrif: toTokenAmount(usdrifBalance, TOKEN_DECIMALS.USDRIF, 'USDRIF'),
    rbtc: toTokenAmount(rbtcBalance, TOKEN_DECIMALS.RBTC, 'RBTC'),
  }
}
