# team-approval-checker

This GitHub Action checks the approvals for a pull request based on specified
conditions.

## Inputs

### `conditions`

**Required**: A JSON string of approval conditions.

### `github-token`

**Required**: The GitHub token.

## Usage

```yaml
- name: Check Approvals
  uses: hayawata3626/team-approval-checker@v1.0.0
  with:
    conditions: '[{"team": "team1", "minimumCount": 1}]'
    github-token: ${{ secrets.GITHUB_TOKEN }}
```
