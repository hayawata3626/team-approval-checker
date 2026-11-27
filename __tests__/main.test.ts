import { jest } from '@jest/globals'
import nock from 'nock'

const getInput = jest.fn<typeof import('@actions/core').getInput>()
const setFailed = jest.fn<typeof import('@actions/core').setFailed>()

jest.unstable_mockModule('@actions/core', () => ({ getInput, setFailed }))
jest.unstable_mockModule('@actions/github', () => ({
  context: {
    repo: {
      owner: 'owner',
      repo: 'repo'
    },
    payload: {
      pull_request: {
        number: 1
      }
    }
  }
}))

const { run } = await import('../src/main.js')

describe('run function', () => {
  it('should not pass all conditions if there are not enough approved reviews', async () => {
    nock('https://api.github.com')
      .get('/repos/owner/repo/pulls/1/reviews')
      .query({ page: 1, per_page: 100 })
      .reply(200, [
        { state: 'PENDING', user: { login: 'user1' } },
        { state: 'PENDING', user: { login: 'user2' } }
      ])
      .get('/orgs/owner/teams/team1/members')
      .reply(200, [{ login: 'user1' }, { login: 'user2' }])
      .get('/orgs/owner/teams/team2/members')
      .reply(200, [{ login: 'user3' }, { login: 'user4' }])
    getInput
      .mockImplementationOnce(
        () =>
          '[{"team": "team1", "minimumCount": 1}, {"team": "team2", "minimumCount": 3}]'
      )
      .mockImplementationOnce(() => 'GITHUB_TOKEN')

    await run()
    expect(setFailed).toHaveBeenCalledWith(
      'The pull request is not approved based on the specified conditions.'
    )
  })

  it('should pass all conditions if there are enough approved reviews', async () => {
    nock('https://api.github.com')
      .get('/repos/owner/repo/pulls/1/reviews')
      .reply(200, [
        { state: 'APPROVED', user: { login: 'user1' } },
        { state: 'APPROVED', user: { login: 'user2' } },
        { state: 'APPROVED', user: { login: 'user3' } },
        { state: 'APPROVED', user: { login: 'user4' } },
        { state: 'APPROVED', user: { login: 'user5' } }
      ])
      .get('/orgs/owner/team1/members')
      .reply(200, [{ login: 'user1' }, { login: 'user2' }])
      .get('/orgs/owner/team2/members')
      .reply(200, [{ login: 'user3' }, { login: 'user4' }, { login: 'user5' }])
    getInput
      .mockImplementationOnce(
        () =>
          '[{"team": "team1", "minimumCount": 2}, {"team": "team2", "minimumCount": 3}]'
      )
      .mockImplementationOnce(() => 'GITHUB_TOKEN')

    await run()

    expect(setFailed).not.toHaveBeenCalledWith(
      'The pull request is not approved based on the specified conditions.'
    )
  })
})
