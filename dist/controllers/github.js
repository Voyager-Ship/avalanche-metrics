"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersContributions = void 0;
const githubMetrics_1 = __importDefault(require("../services/githubMetrics"));
const githubMetrics = new githubMetrics_1.default();
const getUsersContributions = async (req, res) => {
    const users = req.query.users?.toString().split(',');
    if (!users)
        return res.status(400).json({ error: 'users query param required' });
    try {
        const events = await githubMetrics.getContributionsByUsers(users);
        return res.json(events);
    }
    catch (err) {
        res.status(500).json({ error: 'failed to fetch contributions', details: String(err) });
    }
};
exports.getUsersContributions = getUsersContributions;
//# sourceMappingURL=github.js.map