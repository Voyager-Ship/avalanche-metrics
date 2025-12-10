import { Event, ProjectRepository } from "../../types/github";
import { createRateLimiter } from "../../utils/resilienceMethods";
import { User } from "../../types/user";
import { Project } from "../../types/project";
import axios from "axios";
import { neonDb } from "../contributions/neon";
import { IGithubProvider } from "../../interfaces/providers/github";
import { MAX_USERS_PER_REQUEST } from "../../constants/constants";

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

  public async fetchUsersFromDb(page: number): Promise<User[]> {
    const users = await neonDb.query<User>(
      `SELECT * FROM "User" LIMIT $1 OFFSET $2;`,
      [MAX_USERS_PER_REQUEST, this.getOffset(page, MAX_USERS_PER_REQUEST)]
    );
    return users;
  }
  public async fetchUsersFromProjectsFromDb(
    projects: string[],
    page: number
  ): Promise<User[]> {
    const users = await neonDb.query<User>(
      `SELECT "User".* 
      FROM "Project" 
      JOIN "ProjectRepository" ON "Project".id = "ProjectRepository".project_id
      JOIN "Repository" ON "ProjectRepository".repository_id = "Repository".id 
      JOIN "User" ON "Repository".user_id = "User".id 
      WHERE "Project".project_name = ANY($1) LIMIT $2 OFFSET $3;`,
      [
        projects,
        MAX_USERS_PER_REQUEST,
        this.getOffset(page, MAX_USERS_PER_REQUEST),
      ]
    );
    return users;
  }

  public async fetchProjectsFromDb(): Promise<Project[]> {
    const projects = await neonDb.query<Project>('SELECT * FROM "Project"');
    return projects;
  }
  public async fetchProjectsFromUsersFromDb(
    users: string[]
  ): Promise<Project[]> {
    const projects = await neonDb.query<Project>(
      `SELECT "Project".* 
      FROM "User" 
      JOIN "Repository" ON "User".id = "Repository".user_id
      JOIN "ProjectRepository" ON "Repository".id = "ProjectRepository".repository_id
      JOIN "Project" ON "ProjectRepository".project_id = "Project".id 
      WHERE "User".github_user_name = ANY($1)`,
      [users]
    );
    return projects;
  }
  private getOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }
}
