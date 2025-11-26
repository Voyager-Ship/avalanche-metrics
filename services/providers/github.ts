import { Event, ProjectRepository } from "../../types/github";
import { createRateLimiter } from "../../utils/resilienceMethods";
import { User } from "../../types/user";
import { Project } from "../../types/project";
import axios from "axios";
import { neonDb } from "../neon";
import { IGithubProvider } from "../../interfaces/providers/github";

export default class GithubProvider implements IGithubProvider{
  private limiter = createRateLimiter(1000);

  constructor() {}

  public async getContributions(
    githubUsersNames: string[],
    projectsNames: string[]
  ): Promise<{
    repos: (ProjectRepository & Project)[];
    events: Event[];
    users: User[];
  }> {
    const usersEventsPromises = githubUsersNames.map((user) =>
      this.limiter(async () => {
        const res = await axios.get<Event[]>(
          `https://api.github.com/users/${user}/events`
        );
        return res.data;
      })
    );
    const settled = await Promise.allSettled(usersEventsPromises);
    const events: Event[] = [];
    settled.forEach((userEvents) => {
      if (userEvents.status == "fulfilled") {
        events.push(...userEvents.value);
      } else {
        console.error("Error fetching user events:", userEvents.reason);
      }
    });
    const projectsRepos = await neonDb.query<ProjectRepository & Project>(
      `
  SELECT r.*, p.github_repository AS repo_name,  p.project_name, p.id AS project_id
  FROM "Project" p
  LEFT JOIN "ProjectRepository" pr ON pr.project_id = p.id
  LEFT JOIN "Repository" r ON pr.repository_id = r.id
  WHERE p.project_name = ANY($1)
  `,
      [projectsNames]
    );

    const users = await neonDb.query<User>(
      'SELECT * FROM "User" WHERE github_user_name = ANY($1)',
      [githubUsersNames]
    );
    return {
      events: events,
      repos: projectsRepos.map((pr) => ({
        ...pr,
        last_contribution: pr.last_contribution
          ? Number(pr.last_contribution)
          : 0,
        first_contribution: pr.first_contribution
          ? Number(pr.first_contribution)
          : 0,
      })),
      users: users,
    };
  }
}
