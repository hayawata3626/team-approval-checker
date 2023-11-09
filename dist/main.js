"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const axios_1 = __importDefault(require("axios"));
async function getAllReviews(owner, repo, pullNumber, GITHUB_TOKEN) {
    let allReviews = [];
    let page = 1;
    let perPage = 100;
    while (true) {
        const reviewsResponse = await axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                Authorization: `token ${GITHUB_TOKEN}`
            },
            params: {
                page: page,
                per_page: perPage
            }
        });
        allReviews = allReviews.concat(reviewsResponse.data);
        if (reviewsResponse.data.length < perPage) {
            break;
        }
        page++;
    }
    return allReviews;
}
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
    try {
        const conditionsInput = core.getInput('conditions');
        const conditions = JSON.parse(conditionsInput);
        const owner = github.context.repo.owner;
        const repo = github.context.repo.repo;
        const pullNumber = github.context.payload.pull_request
            ?.number;
        const GITHUB_TOKEN = core.getInput('github-token');
        const allReviews = await getAllReviews(owner, repo, pullNumber, GITHUB_TOKEN);
        if (allReviews.length === 0) {
            core.setFailed('There are no reviews for this pull request yet.');
            return;
        }
        const approvedReviews = allReviews.filter((review) => review.state === 'APPROVED');
        const teamApprovalStatus = await Promise.all(conditions.map(async (c) => {
            const res = await axios_1.default.get(`https://api.github.com/orgs/${owner}/teams/${c.team}/members`, {
                headers: {
                    Accept: 'application/vnd.github.v3+json',
                    Authorization: `token ${GITHUB_TOKEN}`
                }
            });
            if (!res.data) {
                core.setFailed('There are no teams for this organization. Or the url is incorrect.');
            }
            const members = res.data;
            return {
                team: c.team,
                minimumCount: c.minimumCount,
                members,
                actuallCount: 0
            };
        }));
        for (const review of approvedReviews) {
            for (const conditionResult of teamApprovalStatus) {
                if (conditionResult.members.some(member => member.login === review.user.login)) {
                    conditionResult.actuallCount++;
                }
            }
        }
        const isPassAllConditions = teamApprovalStatus.every((conditionResult) => conditionResult.actuallCount >= conditionResult.minimumCount);
        if (!isPassAllConditions) {
            core.setFailed('The pull request is not approved based on the specified conditions.');
        }
    }
    catch (error) {
        if (error instanceof Error)
            core.setFailed(error.message);
    }
}
exports.run = run;
//# sourceMappingURL=main.js.map