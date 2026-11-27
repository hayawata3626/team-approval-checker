# team-approval-checker

This GitHub Action checks the approvals for a pull request based on specified
conditions.

## Inputs

### `conditions`

**Required**: A JSON string of approval conditions.

### `github-token`

**Required**: A token that can read the pull request reviews and the members of
the teams in `conditions`.

The default `GITHUB_TOKEN` cannot read organization team members, so use a
GitHub App installation token (recommended) or a fine-grained personal access
token with the following permissions:

| Permission                | Access    | Used for                     |
| ------------------------- | --------- | ---------------------------- |
| Organization: Members     | Read-only | Listing the members of teams |
| Repository: Pull requests | Read-only | Listing the reviews of a PR  |

## Requirements

Since v2.0.0, this action runs on Node.js 24 (`runs.using: node24`).
GitHub-hosted runners support it. Self-hosted runners need
[Actions Runner](https://github.com/actions/runner) v2.327.1 or later.

## Usage

This example uses a GitHub App to create the token. See
[Authenticating with a GitHub App in a GitHub Actions workflow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow)
for details.

<!-- markdownlint-disable MD013 -->

```yaml
name: Check Team Approvals

on:
  pull_request:
    types: [opened, synchronize, reopened]
  # Re-run the check when a review is submitted or dismissed.
  pull_request_review:
    types: [submitted, dismissed]

permissions: {}

jobs:
  check-team-approvals:
    runs-on: ubuntu-latest
    steps:
      - name: Generate a token
        id: generate-token
        uses: actions/create-github-app-token@f418cff399f7aef4c2f0ad47e25ca7a6abbdd6fc # v3.4.0
        with:
          client-id: ${{ vars.APP_CLIENT_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}
          permission-members: read
          permission-pull-requests: read

      - name: Run approval check
        uses: hayawata3626/team-approval-checker@v2.0.0
        with:
          conditions:
            '[{"team": "team1", "minimumCount": 3}, {"team": "team2",
            "minimumCount": 2}]'
          github-token: ${{ steps.generate-token.outputs.token }}
```

<!-- markdownlint-enable MD013 -->

We recommend pinning this action (and the other actions) to a full commit SHA
instead of a tag, for example
`hayawata3626/team-approval-checker@<commit SHA> # v2.0.0`. Dependabot can keep
SHA pins up to date.

To block merging until the conditions are met, add the job as a required status
check in your branch protection rule or ruleset.

Secrets are not passed to workflows triggered by pull requests from forks, so
the token cannot be created for them. This action is intended for pull requests
from branches in the same repository.

## Security considerations

The approval conditions live in the workflow file. On `pull_request` and
`pull_request_review` events, GitHub runs the workflow file from the pull
request, so the author of a pull request could change `conditions` (or remove
the check) in the same pull request and pass the check.

To prevent this, do one of the following:

- Protect `.github/workflows/` with
  [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
  and enable "Require review from Code Owners", so that changes to the workflow
  need approval from the owners.
- Run the check as a
  [required workflow in an organization ruleset](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets),
  so that the workflow comes from a repository that pull request authors cannot
  change.
