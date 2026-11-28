import * as core from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
import { Member, Review } from './types.js'

type Condition = {
  team: string
  minimumCount: number
}

type TeamApprovalStatus = {
  team: string
  members: Member[]
  minimumCount: number
  actualCount: number
}

// Review states that replace a reviewer's previous decision. `COMMENTED`
// and `PENDING` reviews do not change whether a reviewer has approved.
const DECISIVE_REVIEW_STATES = new Set([
  'APPROVED',
  'CHANGES_REQUESTED',
  'DISMISSED'
])

async function getAllPages<T>(url: string, token: string): Promise<T[]> {
  const perPage = 100
  let items: T[] = []
  let page = 1

  while (true) {
    const response = await axios.get(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${token}`
      },
      params: {
        page,
        per_page: perPage
      }
    })

    if (!Array.isArray(response.data)) {
      throw new Error(`Unexpected response from ${url}`)
    }

    items = items.concat(response.data as T[])

    if (response.data.length < perPage) {
      break
    }

    page++
  }

  return items
}

/**
 * Parses and validates the `conditions` input.
 * @param input The raw `conditions` input.
 * @returns The validated conditions.
 */
export function parseConditions(input: string): Condition[] {
  const parsed: unknown = JSON.parse(input)

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('`conditions` must be a non-empty JSON array.')
  }

  return parsed.map((value: unknown, index: number) => {
    const condition = value as Partial<Condition> | null
    if (
      typeof condition?.team !== 'string' ||
      condition.team === '' ||
      !Number.isInteger(condition.minimumCount) ||
      (condition.minimumCount as number) < 1
    ) {
      throw new Error(
        `\`conditions[${index}]\` must have a non-empty string \`team\` and an integer \`minimumCount\` of 1 or more.`
      )
    }
    return { team: condition.team, minimumCount: condition.minimumCount }
  }) as Condition[]
}

/**
 * Returns the logins of the reviewers whose latest decisive review is an
 * approval. Each reviewer is counted once, and a later request for changes
 * or a dismissal cancels an earlier approval.
 * @param reviews All reviews of the pull request.
 * @returns The logins of the approvers.
 */
export function getApprovers(reviews: Review[]): Set<string> {
  const latestStates = new Map<string, string>()

  for (const review of [...reviews].sort((a, b) => a.id - b.id)) {
    if (review.user && DECISIVE_REVIEW_STATES.has(review.state)) {
      latestStates.set(review.user.login, review.state)
    }
  }

  const approvers = new Set<string>()
  for (const [login, state] of latestStates) {
    if (state === 'APPROVED') {
      approvers.add(login)
    }
  }
  return approvers
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const conditions = parseConditions(core.getInput('conditions'))
    const owner: string = github.context.repo.owner
    const repo: string = github.context.repo.repo
    const pullNumber = github.context.payload.pull_request?.number
    const GITHUB_TOKEN: string = core.getInput('github-token')

    if (typeof pullNumber !== 'number') {
      core.setFailed('This action must run on a pull request event.')
      return
    }

    const allReviews = await getAllPages<Review>(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
      GITHUB_TOKEN
    )

    if (allReviews.length === 0) {
      core.setFailed('There are no reviews for this pull request yet.')
      return
    }

    const approvers = getApprovers(allReviews)

    const teamApprovalStatus: TeamApprovalStatus[] = await Promise.all(
      conditions.map(async c => {
        const members = await getAllPages<Member>(
          `https://api.github.com/orgs/${owner}/teams/${encodeURIComponent(c.team)}/members`,
          GITHUB_TOKEN
        )

        return {
          team: c.team,
          minimumCount: c.minimumCount,
          members,
          actualCount: members.filter(member => approvers.has(member.login))
            .length
        }
      })
    )

    const isPassAllConditions = teamApprovalStatus.every(
      (conditionResult: TeamApprovalStatus) =>
        conditionResult.actualCount >= conditionResult.minimumCount
    )

    if (!isPassAllConditions) {
      core.setFailed(
        'The pull request is not approved based on the specified conditions.'
      )
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}
