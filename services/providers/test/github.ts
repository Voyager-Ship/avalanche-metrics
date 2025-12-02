import { Event, ProjectRepository } from "../../../types/github";
import { createRateLimiter } from "../../../utils/resilienceMethods";
import { User } from "../../../types/user";
import { Project } from "../../../types/project";
import { neonDb } from "../../neon";
import { IGithubProvider } from "../../../interfaces/providers/github";

export default class GithubProvider implements IGithubProvider {
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
    const usersEventsPromises = await this.getMockedEvents(
      githubUsersNames,
      projectsNames
    );
    const events: Event[] = [];
    usersEventsPromises.forEach((userEvents) => {
      events.push(userEvents);
    });
    const projectsRepos = await this.getMockedProjectRepos();

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

  public async fetchUsersFromDb(): Promise<User[]> {
    return this.getMockedUsers();
  }
  public async fetchUsersFromProjectsFromDb(
    projects: string[]
  ): Promise<User[]> {
    return this.getMockedUsers();
  }

  public async fetchProjectsFromDb(): Promise<Project[]> {
    return this.getMockedProjects();
  }
  public async fetchProjectsFromUsersFromDb(
    users: string[]
  ): Promise<Project[]> {
    return this.getMockedProjects();
  }
  private getMockedUsers(): User[] {
    return Array.from({ length: 100_000 }, (_, i) => ({
      id: (i + 1).toString(),
      github_user_name: `mockuser${i + 1}`,
    }));
  }

  private getMockedProjects(): Project[] {
    return Array.from({ length: 20_000 }, (_, i) => ({
      project_id: (i + 1).toString(),
      project_name: `mockproject${i + 1}`,
    }));
  }

  private async getMockedEvents(
    users: string[],
    projects: string[]
  ): Promise<Event[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          Array.from({ length: 100_000 }, (_, i) => ({
            id: `event_${i}`,
            type: (i % 2 === 0
              ? "PushEvent"
              : "PullRequestEvent") as Event["type"],
            actor: {
              id: i,
              login: users[i % users.length],
              display_login: users[i % users.length],
              gravatar_id: "",
              url: `https://api.github.com/users/${users[i % users.length]}`,
              avatar_url: `https://avatars.githubusercontent.com/u/${i}?v=4`,
            },
            repo: {
              id: i,
              name: `repo_${i % 50}`,
              url: `https://api.github.com/repos/repo_${i % 50}`,
            },
            payload: {
              push_id: i,
              size: i % 10,
              distinct_size: i % 5,
              ref: `refs/heads/branch_${i % 3}`,
              head: `commit_${i}`,
              before: `commit_${i - 1}`,
              commits: Array.from({ length: i % 5 }, (_, j) => ({
                sha: `commit_${i}_${j}`,
                author: {
                  email: `user${i}@example.com`,
                  name: `User ${i}`,
                },
                message: `Commit message ${j} for event ${i}`,
                distinct: j % 2 === 0,
                url: `https://api.github.com/repos/repo_${
                  i % 50
                }/commits/commit_${i}_${j}`,
              })),
            },
            created_at: Date.now() - i * 1000, // Changed to timestamp (number)
            public: true, // Added to match BaseEvent type
          }))
        );
      }, 3000); // Simulate a 3-second delay
    });
  }

  private async getMockedProjectRepos(): Promise<(ProjectRepository & Project)[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          Array.from({ length: 50_000 }, (_, i) => ({
            id: (i + 1).toString(),
            repo_id: i + 1, // Changed to number to match ProjectRepository type
            repo_name: `mockrepo${i + 1}`,
            project_id: (i % 1000 + 1).toString(),
            project_name: `mockproject${i % 1000 + 1}`,
            github_repository: `mockrepo${i + 1}`,
            last_contribution: Date.now() - i * 1000,
            first_contribution: Date.now() - (i + 1000) * 1000,
            commits: i % 500,
            user_id: `user_${i % 100 + 1}`,
          }))
        );
      }, 3000); // Simulate a 3-second delay
    });
  }
}
