import * as core from '@actions/core'
import { run } from '../src/main'
import nock from 'nock'

jest.mock('@actions/core')
jest.mock('@actions/github', () => ({
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

describe('run function', () => {
  it('should not pass all conditions if there are not enough approved reviews', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
    nock('https://api.github.com')
      .get('/repos/owner/repo/pulls/1/reviews')
      .reply(200, [
        { state: 'PENDING', user: { login: 'user1' } },
        { state: 'PENDING', user: { login: 'user2' } }
      ])
      .get('/orgs/owner/teams/team1/members')
      .reply(200, [{ login: 'user1' }, { login: 'user2' }])
      .get('/orgs/owner/teams/team2/members')
      .reply(200, [{ login: 'user3' }, { login: 'user4' }])
    ;(core.getInput as jest.MockedFunction<typeof core.getInput>)
      .mockImplementationOnce(
        () =>
          '[{"team": "team1", "minimumCount": 1}, {"team": "team2", "minimumCount": 3}]'
      )
      .mockImplementationOnce(() => 'GITHUB_TOKEN')

    await run()
    expect(setFailedMock).toHaveBeenCalledWith(
      'The pull request is not approved based on the specified conditions.'
    )
  })

  it('should pass all conditions if there are enough approved reviews', async () => {
    const setFailedMock = jest.spyOn(core, 'setFailed')
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
    ;(core.getInput as jest.MockedFunction<typeof core.getInput>)
      .mockImplementationOnce(
        () =>
          '[{"team": "team1", "minimumCount": 2}, {"team": "team2", "minimumCount": 3}]'
      )
      .mockImplementationOnce(() => 'GITHUB_TOKEN')

    await run()

    expect(setFailedMock).not.toHaveBeenCalledWith(
      'The pull request is not approved based on the specified conditions.'
    )
  })
})
