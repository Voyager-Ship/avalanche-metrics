import axios from "axios";
import { Event } from "../types/event";
import { neonDb } from "./neon";

export default class GithubMetrics {
  constructor() {}

  public async getContributionsByUsers(
    users: string[]
  ): Promise<{ [user: string]: Event[] | null }> {
    const currentContributions = await neonDb.query(
      'SELECT c.*, u.github_user_name FROM "Contribution" c JOIN "User" u ON c.user_id = u.id WHERE u.github_user_name = ANY($1)',
      [users]
    );
    const eventsPromises = users.map(
      async (user) =>
        (
          await axios.get<Event[]>(
            `https://api.github.com/users/${user}/events`
          )
        ).data
    );

    const settled = await Promise.allSettled(eventsPromises);

    const commits: { [user: string]: Event[] | null } = {};
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      let userId = currentContributions.find(
        (cc) => cc.github_user_name === user
      )?.user_id;
      if (!userId) {
        userId = await this.ensureUserId(user);
      }
      const result = settled[i];
      if (result.status === "fulfilled") {
        const newContributions = result.value.filter(
          (value) => !currentContributions.some((cc) => cc.id === value.id)
        );
        const oldContributions = currentContributions.filter(
          (cc) => cc.github_user_name === user
        );
        commits[user] = [...newContributions, ...oldContributions];
        newContributions.forEach(async (contribution) => {
          await neonDb.query(
            'INSERT INTO "Contribution" (id, user_id, created_at, type, repo_id, repo_name, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
              contribution.id,
              userId,
              contribution.created_at,
              contribution.type,
              contribution.repo.id,
              contribution.repo.name,
              new Date(contribution.created_at).getTime(),
            ]
          );
        });
      } else {
        commits[user] = null;
        console.warn(`Failed to fetch events for ${user}:`, result.reason);
      }
    }

    return commits;
  }
  private async ensureUserId(
    githubUserName: string
  ): Promise<string | undefined> {
    const found = await neonDb.query<{ id: string }>(
      'SELECT id FROM "User" WHERE github_user_name = $1 LIMIT 1',
      [githubUserName]
    );
    if (found.length > 0) return found[0].id;

    const inserted = await neonDb.query<{ id: string }>(
      'INSERT INTO "User" (github_user_name) VALUES ($1) RETURNING id',
      [githubUserName]
    );
    if (inserted.length > 0) return inserted[0].id;
  }
}
