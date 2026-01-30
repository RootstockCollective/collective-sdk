import type { Address } from 'viem'
import { toTokenAmount } from '@rsksmart/sdk-base'
import { ProposalCategory, type ProposalAction } from './types'

const MAX_NAME_LENGTH = 100
const DISCOURSE_LINK_SEPARATOR = 'DiscourseLink:'
const MILESTONE_SEPARATOR = 'M1lestone:'

/**
 * Parse proposal description to extract title and body
 */
export function parseProposalDescription(description: string): {
  title: string
  body: string
  fullTitle?: string
} {
  if (description.includes(';')) {
    const [name, ...rest] = description.split(';')
    return {
      title: name.substring(0, MAX_NAME_LENGTH),
      body: rest.join(';').trim(),
      fullTitle: name,
    }
  }

  if (description.includes('  ')) {
    const firstLineBreak = description.indexOf('\n')
    const firstPeriod = description.indexOf('.')
    const nameEndIndex = Math.min(
      firstLineBreak > -1 ? firstLineBreak : Infinity,
      firstPeriod > -1 ? firstPeriod : Infinity
    )

    return {
      title: description.substring(0, nameEndIndex).substring(0, MAX_NAME_LENGTH),
      body: description,
      fullTitle: description.substring(0, nameEndIndex),
    }
  }

  return {
    title: description.substring(0, MAX_NAME_LENGTH),
    body: description,
    fullTitle: description,
  }
}

/**
 * Extract Discourse URL from proposal description
 */
export function extractDiscourseUrl(description: string): string | undefined {
  const startIndex = description.indexOf(DISCOURSE_LINK_SEPARATOR)

  if (startIndex === -1) {
    return undefined
  }

  const afterLink = startIndex + DISCOURSE_LINK_SEPARATOR.length
  const firstSpaceIndex = description.indexOf(' ', afterLink)

  if (firstSpaceIndex === -1) {
    return description.substring(afterLink).trim()
  }

  return description.substring(afterLink, firstSpaceIndex).trim()
}

/**
 * Determine proposal category from description and calldatas
 */
export function determineProposalCategory(
  description: string,
  calldatas: `0x${string}`[]
): ProposalCategory {
  const milestoneRegex = new RegExp(`${MILESTONE_SEPARATOR}(\\S+)`, 'i')
  const milestoneMatch = description.match(milestoneRegex)

  if (milestoneMatch) {
    const milestoneNumber = milestoneMatch[1]
    switch (milestoneNumber) {
      case '1':
        return ProposalCategory.Milestone1
      case '2':
        return ProposalCategory.Milestone2
      case '3':
        return ProposalCategory.Milestone3
    }
  }

  for (const calldata of calldatas) {
    const selector = calldata.slice(0, 10).toLowerCase()

    if (
      selector === '0x8da5cb5b' || // communityApproveBuilder
      selector === '0x9b19251a' // whitelistBuilder
    ) {
      return ProposalCategory.Activation
    }

    if (
      selector === '0x9b19251b' || // communityBanBuilder
      selector === '0x9b19251c' // removeWhitelistedBuilder
    ) {
      return ProposalCategory.Deactivation
    }
  }

  return ProposalCategory.Grants
}

/**
 * Parse proposal actions from calldatas
 * This is a simplified parser - full parsing would require ABI decoding
 */
export function parseProposalActions(
  targets: Address[],
  values: bigint[],
  calldatas: `0x${string}`[]
): ProposalAction[] {
  const actions: ProposalAction[] = []

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]
    const value = values[i] || 0n
    const calldata = calldatas[i] || '0x'

    const selector = calldata.slice(0, 10).toLowerCase()

    let action: ProposalAction = {
      type: 'unknown',
      target,
      calldata,
      value,
    }

    if (selector === '0xa9059cbb' && calldata.length >= 138) {
      const toAddress = ('0x' + calldata.slice(34, 74)) as Address
      const amountHex = '0x' + calldata.slice(74, 138)
      const amount = BigInt(amountHex)

      action = {
        type: 'transfer',
        target,
        to: toAddress,
        amount: toTokenAmount(amount, 18), // TODO: use TOKEN_DECIMALS from sdk-base (later)
        calldata,
        value,
      }
    }

    // approve(address,uint256) = 0x095ea7b3
    else if (selector === '0x095ea7b3' && calldata.length >= 138) {
      const spender = ('0x' + calldata.slice(34, 74)) as Address
      const amountHex = '0x' + calldata.slice(74, 138)
      const amount = BigInt(amountHex)

      action = {
        type: 'approve',
        target,
        to: spender,
        amount: toTokenAmount(amount, 18),
        calldata,
        value,
      }
    }

    actions.push(action)
  }

  return actions
}

/**
 * Format a proposal type string based on actions
 */
export function formatProposalType(actions: ProposalAction[]): string {
  if (actions.length === 0) return 'Unknown'

  const firstAction = actions[0]

  if (firstAction.type === 'transfer' && firstAction.amount) {
    return `Transfer of ${firstAction.amount.formatted} ${firstAction.amount.symbol || 'tokens'}`
  }

  if (firstAction.type === 'approve' && firstAction.amount) {
    return `Approve ${firstAction.amount.formatted} ${firstAction.amount.symbol || 'tokens'}`
  }

  return firstAction.type.charAt(0).toUpperCase() + firstAction.type.slice(1)
}
