"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Simple Github metrics service class.
 * Replace console stubs with real GitHub API calls as needed.
 */
class GithubMetrics {
    /**
     * Accept a token directly, or fallback to process.env.GITHUB_API_KEY.
     * Throws if no token is available so callers are explicit about auth.
     */
    constructor(token) {
        this.token = token ?? process.env.GITHUB_API_KEY ?? '';
        if (!this.token) {
            throw new Error('GITHUB_API_KEY not set. Provide a token to GithubMetrics constructor or set GITHUB_API_KEY in your environment.');
        }
    }
    async getEventsByUser(user) {
        // Example: you could use fetch or @octokit/rest here and pass this.token for auth.
        console.log('Fetching events for user:', user);
        // don't log full token in production
        console.log('Fetching events for token (preview):', this.token ? `${this.token.slice(0, 6)}...` : '<none>');
        // Return a small shape that callers can rely on while developing
        return {
            user,
            tokenPreview: this.token ? `${this.token.slice(0, 6)}...${this.token.slice(-4)}` : null,
            events: [],
            note: 'stub - implement GitHub API calls in GithubMetrics.getEventsByUser'
        };
    }
}
exports.default = GithubMetrics;
//# sourceMappingURL=githubMetrics.js.map