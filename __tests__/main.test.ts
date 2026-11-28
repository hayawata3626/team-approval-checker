import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import nock from 'nock'

const getInput = vi.fn<typeof import('@actions/core').getInput>()
const setFailed = vi.fn<typeof import('@actions/core').setFailed>()

const context = {
  repo: {
    owner: 'owner',
    repo: 'repo'
  },
  payload: {
    pull_request: {
      number: 1
    }
  } as { pull_request?: { number: number } }
}

// `@actions/github` sends requests with undici's own `fetch`, which nock does
// not intercept. Use the global `fetch` so that nock can mock the API.
const { getOctokit } = await import('@actions/github')

vi.doMock('@actions/core', () => ({ getInput, setFailed }))
vi.doMock('@actions/github', () => ({
  context,
  getOctokit: (token: string) => getOctokit(token, { request: { fetch } })
}))

const { run, getApprovers, parseConditions } = await import('../src/main.js')

const NOT_APPROVED =
  'The pull request is not approved based on the specified conditions.'

type ReviewFixture = [state: string, login: string]

function mockReviews(reviews: ReviewFixture[]): void {
  nock('https://api.github.com')
    .get('/repos/owner/repo/pulls/1/reviews')
    .query({ per_page: 100 })
    .reply(
      200,
      reviews.map(([state, login], index) => ({
        id: index + 1,
        state,
        user: { login }
      }))
    )
}

function mockTeam(team: string, logins: string[]): void {
  nock('https://api.github.com')
    .get(`/orgs/owner/teams/${team}/members`)
    .query({ per_page: 100 })
    .reply(
      200,
      logins.map(login => ({ login }))
    )
}

function mockInputs(conditions: string): void {
  getInput.mockImplementation(name =>
    name === 'conditions' ? conditions : 'GITHUB_TOKEN'
  )
}

beforeAll(() => {
  nock.disableNetConnect()
})

afterEach(() => {
  nock.cleanAll()
  context.payload = { pull_request: { number: 1 } }
})

afterAll(() => {
  nock.enableNetConnect()
})

describe('run function', () => {
  it('should not pass all conditions if there are not enough approved reviews', async () => {
    mockReviews([
      ['PENDING', 'user1'],
      ['PENDING', 'user2']
    ])
    mockTeam('team1', ['user1', 'user2'])
    mockTeam('team2', ['user3', 'user4'])
    mockInputs(
      '[{"team": "team1", "minimumCount": 1}, {"team": "team2", "minimumCount": 3}]'
    )

    await run()

    expect(setFailed).toHaveBeenCalledWith(NOT_APPROVED)
  })

  it('should pass all conditions if there are enough approved reviews', async () => {
    mockReviews([
      ['APPROVED', 'user1'],
      ['APPROVED', 'user2'],
      ['APPROVED', 'user3'],
      ['APPROVED', 'user4'],
      ['APPROVED', 'user5']
    ])
    mockTeam('team1', ['user1', 'user2'])
    mockTeam('team2', ['user3', 'user4', 'user5'])
    mockInputs(
      '[{"team": "team1", "minimumCount": 2}, {"team": "team2", "minimumCount": 3}]'
    )

    await run()

    expect(setFailed).not.toHaveBeenCalled()
  })

  it('should count each reviewer only once', async () => {
    mockReviews([
      ['APPROVED', 'user1'],
      ['APPROVED', 'user1'],
      ['APPROVED', 'user1']
    ])
    mockTeam('team1', ['user1', 'user2', 'user3'])
    mockInputs('[{"team": "team1", "minimumCount": 3}]')

    await run()

    expect(setFailed).toHaveBeenCalledWith(NOT_APPROVED)
  })

  it('should not count an approval that was followed by a request for changes', async () => {
    mockReviews([
      ['APPROVED', 'user1'],
      ['APPROVED', 'user2'],
      ['CHANGES_REQUESTED', 'user2']
    ])
    mockTeam('team1', ['user1', 'user2'])
    mockInputs('[{"team": "team1", "minimumCount": 2}]')

    await run()

    expect(setFailed).toHaveBeenCalledWith(NOT_APPROVED)
  })

  it('should count members on every page of the team', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => ({
      login: `member${i}`
    }))
    mockReviews([['APPROVED', 'late-member']])
    nock('https://api.github.com')
      .get('/orgs/owner/teams/team1/members')
      .query({ per_page: 100 })
      .reply(200, firstPage, {
        Link: '<https://api.github.com/orgs/owner/teams/team1/members?per_page=100&page=2>; rel="next"'
      })
      .get('/orgs/owner/teams/team1/members')
      .query({ page: 2, per_page: 100 })
      .reply(200, [{ login: 'late-member' }])
    mockInputs('[{"team": "team1", "minimumCount": 1}]')

    await run()

    expect(setFailed).not.toHaveBeenCalled()
  })

  it('should fail if conditions is an empty array', async () => {
    mockInputs('[]')

    await run()

    expect(setFailed).toHaveBeenCalledWith(
      '`conditions` must be a non-empty JSON array.'
    )
  })

  it('should fail if it does not run on a pull request', async () => {
    context.payload = {}
    mockInputs('[{"team": "team1", "minimumCount": 1}]')

    await run()

    expect(setFailed).toHaveBeenCalledWith(
      'This action must run on a pull request event.'
    )
  })

  it('should fail if the GitHub API returns an error', async () => {
    mockReviews([['APPROVED', 'user1']])
    nock('https://api.github.com')
      .get('/orgs/owner/teams/team1/members')
      .query(true)
      .reply(404, { message: 'Not Found' })
    mockInputs('[{"team": "team1", "minimumCount": 1}]')

    await run()

    expect(setFailed).toHaveBeenCalledWith(expect.stringContaining('Not Found'))
  })
})

describe('getApprovers', () => {
  const review = (
    id: number,
    state: string,
    login: string | null
  ): Parameters<typeof getApprovers>[0][number] => ({
    id,
    state,
    user: login === null ? null : { login }
  })

  it('should use the latest decisive review of each reviewer', () => {
    const approvers = getApprovers([
      review(1, 'CHANGES_REQUESTED', 'user1'),
      review(2, 'APPROVED', 'user1'),
      review(3, 'APPROVED', 'user2'),
      review(4, 'DISMISSED', 'user2'),
      review(5, 'APPROVED', 'user3'),
      review(6, 'COMMENTED', 'user3'),
      review(7, 'APPROVED', null)
    ])

    expect([...approvers].sort()).toEqual(['user1', 'user3'])
  })

  it('should not depend on the order of the API response', () => {
    const approvers = getApprovers([
      review(2, 'CHANGES_REQUESTED', 'user1'),
      review(1, 'APPROVED', 'user1')
    ])

    expect(approvers.size).toBe(0)
  })
})

describe('parseConditions', () => {
  it.each([
    ['{"team": "team1", "minimumCount": 1}'],
    ['[{"team": "", "minimumCount": 1}]'],
    ['[{"team": "team1"}]'],
    ['[{"team": "team1", "minimumCount": 0}]'],
    ['[{"team": "team1", "minimumCount": 1.5}]'],
    ['[{"team": "team1", "minimumCount": "2"}]'],
    ['[null]']
  ])('should reject %s', input => {
    expect(() => parseConditions(input)).toThrow()
  })

  it('should accept valid conditions', () => {
    expect(
      parseConditions('[{"team": "team1", "minimumCount": 2, "extra": true}]')
    ).toEqual([{ team: 'team1', minimumCount: 2 }])
  })
})
