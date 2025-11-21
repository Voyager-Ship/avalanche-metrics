import axios from "axios";
import { ContributionsData, Event, ProjectRepository } from "../types/github";
import { User } from "../types/user";
import { neonDb } from "./neon";

export default class GithubMetrics {
  constructor() {}

  public async getContributionsByUsersAndProjects(
    githubUsersNames: string[],
    reposNames: string[]
  ): Promise<ContributionsData> {
    const data: ContributionsData = {};
    const { currentRepos, events, users } = await this.getContributionsData(
      githubUsersNames,
      reposNames
    );
    const newRepos = currentRepos.filter((repo) => repo.repo_id == null);
    this.insertNewRepos(newRepos, events, users)
    return data;
  }

  private async getContributionsData(
    githubUsersNames: string[],
    projectsNames: string[]
  ): Promise<{
    currentRepos: ProjectRepository[];
    events: Event[];
    users: User[];
  }> {
    const usersEventsPromises = githubUsersNames.map(
      async (user) =>
        (
          await axios.get<Event[]>(
            `https://api.github.com/users/${user}/events`
          )
        ).data
    );
    const settled = await Promise.allSettled(usersEventsPromises);
    const events: Event[] = [];
    settled.forEach((userEvents) => {
      if (userEvents.status == "fulfilled") {
        events.push(...userEvents.value);
      }
    });
    const currentRepos = await neonDb.query<
      ProjectRepository & { project_name: string }
    >(
      `
  SELECT r.*, p.github_repository AS repo_name,  p.project_name
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
      currentRepos: currentRepos,
      users: users,
    };
  }
  private async insertNewRepos(
    repos: ProjectRepository[],
    events: Event[],
    users: User[]
  ) {
    const reposToInsert: ProjectRepository[] = [];
    users.forEach((user) => {
      repos.forEach((repo) => {
        const reposNames = repo.repo_name.split(",").map((r) => r.trim());

        reposNames.forEach((singleName) => {
          const hasEvent = events.some(
            (event) =>
              event.actor.login === user.github_user_name &&
              event.repo.name === singleName.replace('https://api.github.com/repos/', '')
          );
          if (hasEvent) {
            reposToInsert.push({
              ...repo,
              repo_name: singleName
            })
          }
        });
      });
    });
    console.log('Repos to insert: ', reposToInsert)
    // neonDb.query(
    //   `INSET INTO "Repository" ( repo_id, repo_name, user_id, commits, first_contribution, last_contribution)  SELECT * FROM UNNEST ($1::text[], $2::text[], $3::text[], $4::int[], $5::int[], $6::int[])`,
    //   [repos.map((repo) => repo.id), repos.map((repo) => repo.repo_name)]
    // );
  }
}
