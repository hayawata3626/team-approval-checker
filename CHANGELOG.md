# Changelog

## [2.0.0](https://github.com/hayawata3626/team-approval-checker/compare/v1.2.2...v2.0.0) (2026-11-28)


### ⚠ BREAKING CHANGES

* the action now runs on Node.js 24 (runs.using: node24), which requires Actions Runner v2.327.1 or later.

### Bug Fixes

* count each reviewer's latest review once and fail on invalid conditions ([e0a031a](https://github.com/hayawata3626/team-approval-checker/commit/e0a031af6fb87fe0d7f084f11e92d9eb47adaa00))
* count each reviewer's latest review once and fail on invalid conditions ([f2b2656](https://github.com/hayawata3626/team-approval-checker/commit/f2b26561e903266c8bfe5bd43cd7032a08a0bb40))
* **deps:** upgrade axios to 1.21.1 and [@actions](https://github.com/actions) packages to fix vulnerabilities ([2b36816](https://github.com/hayawata3626/team-approval-checker/commit/2b36816f0ce08927cb596d533162f63bffb73954))


### Build System

* migrate to ESM and upgrade @actions/core to v3, @actions/github to v9 ([7e3b2b3](https://github.com/hayawata3626/team-approval-checker/commit/7e3b2b3f17d43b36ad87531a268c32a708acbbee))

## [1.2.2](https://github.com/hayawata3626/team-approval-checker/compare/v1.2.1...v1.2.2) (2026-04-13)


### Bug Fixes

* **deps:** upgrade axios to 1.15.0 to fix CRLF injection vulnerability ([dea25eb](https://github.com/hayawata3626/team-approval-checker/commit/dea25ebc91f025b8bf50ba448ce24c3e30ba094e))

## [1.2.1](https://github.com/hayawata3626/team-approval-checker/compare/v1.2.0...v1.2.1) (2026-03-31)


### Bug Fixes

* **deps:** pin axios to 1.5.1 to avoid supply chain attack ([62e1326](https://github.com/hayawata3626/team-approval-checker/commit/62e132657a04592abec86f5507fe4acf203dc558))

## [1.2.0](https://github.com/hayawata3626/team-approval-checker/compare/v1.1.0...v1.2.0) (2023-12-31)


### Features

* add support for PRs with more than 30 reviews ([#21](https://github.com/hayawata3626/team-approval-checker/issues/21)) ([6ff2b03](https://github.com/hayawata3626/team-approval-checker/commit/6ff2b0353a36bbada95ea1992389ed2de395c7bf))
