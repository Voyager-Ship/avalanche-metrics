"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserEvents = void 0;
const githubMetrics_1 = __importDefault(require("../services/githubMetrics"));
// Pass the token explicitly from process.env so the service uses it directly.
const githubMetrics = new githubMetrics_1.default(process.env.GITHUB_API_KEY);
const getUserEvents = async (req, res) => {
    const user = req.params.user;
    if (!user)
        return res.status(400).json({ error: 'user param required' });
    try {
        const events = await githubMetrics.getEventsByUser(user);
        return res.json(events);
    }
    catch (err) {
        res.status(500).json({ error: 'failed to fetch events', details: String(err) });
    }
};
exports.getUserEvents = getUserEvents;
//# sourceMappingURL=github.js.map