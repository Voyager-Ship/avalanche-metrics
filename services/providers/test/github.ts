import { Event, ProjectRepository } from "../../../types/github";
import { User } from "../../../types/user";
import { Project } from "../../../types/project";
import { IGithubProvider } from "../../../interfaces/providers/github";

export default class MockedGithubProvider implements IGithubProvider {
  private records: number;
  constructor(records: number) {
    this.records = records;
  }

  public async getContributions(
    githubUsersNames: string[],
    projectsNames: string[]
  ): Promise<{
    repos: (ProjectRepository & Project)[];
    events: Event[];
    users: User[];
  }> {
    const events = await this.getMockedEvents(githubUsersNames, projectsNames);
    console.debug("Events generated: ", events.length);
    const projectsRepos = await this.getMockedProjectRepos();
    console.debug("Repos generated: ", projectsRepos.length);

    const users = this.getMockedUsers();
    console.debug("Users generated: ", users.length);

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
    return Array.from({ length: this.records }, (_, i) => ({
      id: "cm9ltu77a0000l404ks3e4yy7",
      github_user_name: `mockedUser${i + 1}`,
    }));
  }

  private getMockedProjects(): Project[] {
    return Array.from({ length: this.records * 0.2 }, (_, i) => ({
      project_id: (i + 1).toString(),
      project_name: `mockedProject${i + 1}`,
    }));
  }

  private async getMockedEvents(
    users: string[],
    projects: string[]
  ): Promise<Event[]> {
    const activeUsers = users.slice(0, Math.max(1, Math.floor(users.length * 0.4)));
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          Array.from({ length: this.records * 0.4 * 10 }, (_, i) => ({
            id: `event_${i}`,
            type: (i % 2 === 0
              ? "PushEvent"
              : "PullRequestEvent") as Event["type"],
            actor: {
              id: i,
              login: activeUsers[Math.round(i / 10)],
              display_login: activeUsers[i % activeUsers.length],
              gravatar_id: "",
              url: `https://api.github.com/users/${activeUsers[i % activeUsers.length]}`,
              avatar_url: `https://avatars.githubusercontent.com/u/${i}?v=4`,
            },
            repo: {
              id: i,
              name: `mockedrepo${Math.round(i / 10)}`,
              url: `https://api.github.com/repos/repo_${
                i % (this.records * 0.4)
              }`,
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

  private async getMockedProjectRepos(): Promise<
    (ProjectRepository & Project)[]
  > {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          Array.from({ length: this.records * 0.4 }, (_, i) => ({
            id: (i + 1).toString(),
            repo_id: null,
            repo_name: `mockedrepo${i}`,
            project_id: "jose1",
            project_name: `mockedProject${(i % 1000) + 1}`,
            github_repository: `mockedRepo${i + 1}`,
            last_contribution: Date.now() - i * 1000,
            first_contribution: Date.now() - (i + 1000) * 1000,
            commits: i % 500,
            user_id: "cm9ltu77a0000l404ks3e4yy7",
          }))
        );
      }, 3000); // Simulate a 3-second delay
    });
  }
}
