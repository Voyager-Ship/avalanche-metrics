import axios from 'axios';
import { Event } from '../types/event'

export default class GithubMetrics {
  constructor() { }

  public async getContributionsByUsers(users: string[]): Promise<{ [user: string]: Event[] | null }> {
    const promises = users.map(user =>
      axios.get<Event[]>(`https://api.github.com/users/${user}/events`).then(res => res.data)
    );

    const settled = await Promise.allSettled(promises);

    const commits: { [user: string]: Event[] | null } = {};
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const result = settled[i];
      if (result.status === "fulfilled") {
        commits[user] = result.value.filter((value) => value.type == 'PushEvent');
      } else {
        commits[user] = null;
        console.warn(`Failed to fetch events for ${user}:`, result.reason);
      }
    }

    return commits;
  }
}
