import axios from 'axios';
import { Event } from '../types/event'
import { neonDb } from './neon'

export default class GithubMetrics {
  constructor() { }

  public async getContributionsByUsers(users: string[]): Promise<{ [user: string]: Event[] | null }> {
    const currentContributions = await neonDb.query('SELECT c.*, u.github_user_name FROM "Contribution" c JOIN "User" u ON c.user_id = u.id WHERE u.github_user_name = ANY($1)', [users]);
    const eventsPromises = users.map(user =>
      axios.get<Event[]>(`https://api.github.com/users/${user}/events`).then(res => res.data)
    );

    const settled = await Promise.allSettled(eventsPromises);

    const commits: { [user: string]: Event[] | null } = {};
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const userId = currentContributions.find(cc => cc.github_user_name === user)?.user_id;
      const result = settled[i];
      if (result.status === "fulfilled") {
        const newContributions = result.value.filter((value) => value.type == 'PushEvent' && !currentContributions.some(cc => cc.id === value.id))
        const oldContributions = currentContributions.filter(cc => cc.github_user_name === user)
        commits[user] = [...newContributions, ...oldContributions]
        newContributions.forEach(async (contribution) => {
          await neonDb.query(
            'INSERT INTO "Contribution" (id, user_id, created_at) VALUES ($1, $2, $3)',
            [contribution.id, userId ,contribution.created_at ]
          );
        })
      } else {
        commits[user] = null;
        console.warn(`Failed to fetch events for ${user}:`, result.reason);
      }
    }

    return commits;
  }
}
