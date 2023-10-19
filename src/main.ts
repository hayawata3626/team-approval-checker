import * as core from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
import { Member, Review } from './types'

type Condition = {
  team: string
  minimumCount: number
}

type Parameters = Condition[]

type TeamApprovalStatus = {
  team: string
  members: Member[]
  minimumCount: number
  actuallCount: number
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const conditionsInput = core.getInput('conditions')
    const conditions: Parameters = JSON.parse(conditionsInput)
    const owner: string = github.context.repo.owner
    const repo: string = github.context.repo.repo
    const pullNumber: number = github.context.payload.pull_request
      ?.number as number
    const GITHUB_TOKEN: string = core.getInput('github-token')
    console.log('conditionsInput', conditionsInput)
    console.log('owner', owner)
    console.log('repo', repo)
    console.log('pullNumber', pullNumber)

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${GITHUB_TOKEN}`
        }
      }
    )

    if (response.data.length === 0) {
      core.setFailed(
        'There are no reviews for this pull request yet. Or the url is incorrect.'
      )
    }

    const approvedReviews = response.data.filter(
      (review: Review) => review.state === 'APPROVED'
    )

    const teamApprovalStatus: TeamApprovalStatus[] = await Promise.all(
      conditions.map(async c => {
        console.log(c, 'c')
        const res = await axios.get(
          `https://api.github.com/orgs/${owner}/teams/${c.team}/members`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              Authorization: `token ${GITHUB_TOKEN}`
            }
          }
        )

        console.log(res, 'res')
        if (!res.data) {
          core.setFailed(
            'There are no teams for this organization. Or the url is incorrect.'
          )
        }

        const members = res.data

        console.log(members, 'members')

        return {
          team: c.team,
          minimumCount: c.minimumCount,
          members,
          actuallCount: 0
        }
      })
    )

    for (const review of approvedReviews) {
      for (const conditionResult of teamApprovalStatus) {
        if (
          conditionResult.members.some(
            member => member.login === review.user.login
          )
        ) {
          conditionResult.actuallCount++
        }
      }
    }

    const isPassAllConditions = teamApprovalStatus.every(
      (conditionResult: TeamApprovalStatus) =>
        conditionResult.actuallCount >= conditionResult.minimumCount
    )

    if (!isPassAllConditions) {
      core.setFailed(
        'The pull request is not approved based on the specified conditions.'
      )
    }

    console.log(response, 'response')
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
