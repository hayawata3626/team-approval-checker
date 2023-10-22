# team-approval-checker

This GitHub Action checks the approvals for a pull request based on specified
conditions.

## Inputs

### `conditions`

**Required**: A JSON string of approval conditions.

### `github-token`

**Required**: The GitHub token.

This github actions will retrieve members in the organization, so please give
the github token the appropriate permissions.

## Usage

This is an example: github apps is used to retrieve the token. See here for
[details](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow).

```yaml
name: Check Team Approvals

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check-team-approvals:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Generate a token
        id: generate_token
        uses: tibdex/github-app-token@v1
        with:
          app_id: ${{ secrets.APP_ID }}
          private_key: ${{ secrets.PRIVATE_KEY }}

      - name: Run approval check
        uses: hayawata3626/team-approval-checker@v1.0.8
        with:
          conditions:
            '[{"team": "team1", "minimumCount": 3}, {"team": "team2",
            "minimumCount": 2}]'
          github-token: ${{ steps.generate_token.outputs.token }}
```
