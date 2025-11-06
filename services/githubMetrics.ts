import axios from 'axios';

export default class GithubMetrics {
  constructor() { }

  public async getEventsByUser(user: string): Promise<any> {
    try {
      const response = await axios.get(`https://api.github.com/users/${user}/events`)
      return response.data;
    }
    catch (err) {
      throw new Error(`Error fetching events for user ${user}: ${err}`);
    }
  }
}
