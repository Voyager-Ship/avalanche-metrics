"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class GithubMetrics {
    constructor() { }
    async getContributionsByUsers(users) {
        const promises = users.map(user => axios_1.default.get(`https://api.github.com/users/${user}/events`).then(res => res.data));
        const settled = await Promise.allSettled(promises);
        const commits = {};
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const result = settled[i];
            if (result.status === "fulfilled") {
                commits[user] = result.value.filter((value) => value.type == 'PushEvent');
            }
            else {
                commits[user] = null;
                console.warn(`Failed to fetch events for ${user}:`, result.reason);
            }
        }
        return commits;
    }
}
exports.default = GithubMetrics;
//# sourceMappingURL=githubMetrics.js.map