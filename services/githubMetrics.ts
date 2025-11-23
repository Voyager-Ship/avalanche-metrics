import axios from "axios";
import { ContributionsData, Event, ProjectRepository } from "../types/github";
import { User } from "../types/user";
import { Project } from "../types/project";
import { neonDb } from "./neon";

export default class GithubMetrics {
  constructor() {}

  public async getContributionsByUsersAndProjects(
    githubUsersNames: string[],
    reposNames: string[]
  ): Promise<ContributionsData> {
    const data: ContributionsData = {};
    const { repos, events, users } = await this.getContributionsData(
      githubUsersNames,
      reposNames
    );
    let newRepos = repos.filter((repo) => repo.repo_id == null);
    newRepos = await this.insertNewRepos(newRepos, events, users);
    let currentRepos = repos.filter((repo) => repo.repo_id != null);
    await this.updateCurrentRepos(currentRepos, events, users);
    githubUsersNames.forEach((userName) => {
      const user = users.find((u) => u.github_user_name == userName);
      if (user) {
        data[user.github_user_name] = [
          ...newRepos.filter((repo) => repo.user_id == user.id),
          ...currentRepos.filter((repo) => repo.user_id == user.id),
        ];
      } else {
        data[userName] = [];
      }
    });
    return data;
  }

  private async getContributionsData(
    githubUsersNames: string[],
    projectsNames: string[]
  ): Promise<{
    repos: (ProjectRepository & Project)[];
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
  private async insertNewRepos(
    repos: (ProjectRepository & Project)[],
    events: Event[],
    users: User[]
  ) {
    const reposToInsert: (ProjectRepository & Project)[] = [];
    users.forEach((user) => {
      repos.forEach((repo) => {
        const reposNames = repo.repo_name.split(",").map((r) => r.trim());

        reposNames.forEach((singleName) => {
          const reposEvents = events.filter(
            (event) =>
              event.actor.login === user.github_user_name &&
              event.repo.name ===
                singleName.replace("https://api.github.com/repos/", "")
          );
          if (reposEvents.length > 0) {
            reposToInsert.push({
              id: "",
              repo_id: reposEvents[0].repo.id,
              user_id: user.id,
              first_contribution: new Date(
                reposEvents[reposEvents.length - 1].created_at
              ).getTime(),
              last_contribution: new Date(reposEvents[0].created_at).getTime(),
              commits: reposEvents.length,
              repo_name: singleName,
              project_name: repo.project_name,
              project_id: repo.project_id,
            });
          }
        });
      });
    });

    const result = await neonDb.query(
      `
    INSERT INTO "Repository" (
      repo_id, 
      repo_name, 
      user_id, 
      commits, 
      first_contribution, 
      last_contribution
    )
    SELECT * FROM UNNEST (
      $1::text[], 
      $2::text[], 
      $3::text[], 
      $4::int[], 
      $5::bigint[], 
      $6::bigint[]
    )
    RETURNING id;
    `,
      [
        reposToInsert.map((r) => String(r.repo_id)),
        reposToInsert.map((r) => r.repo_name),
        reposToInsert.map((r) => String(r.user_id)),
        reposToInsert.map((r) => r.commits),
        reposToInsert.map((r) => r.first_contribution),
        reposToInsert.map((r) => r.last_contribution),
      ]
    );

    result.forEach((row, i) => {
      reposToInsert[i].id = row.id;
    });

    await neonDb.query(
      `
    INSERT INTO "ProjectRepository" (project_id, repository_id)
    SELECT * FROM UNNEST (
      $1::text[],
      $2::text[]
    )
    ON CONFLICT (project_id, repository_id) DO NOTHING;
    `,
      [
        reposToInsert.map((r) => String(r.project_id)),
        reposToInsert.map((r) => String(r.id)),
      ]
    );

    return reposToInsert;
  }

  private async updateCurrentRepos(
    repos: (ProjectRepository & Project)[],
    events: Event[],
    users: User[]
  ) {
    const reposToUpdate: (ProjectRepository & Project)[] = [];
    users.forEach((user) => {
      repos.forEach((repo) => {
        const reposNames = repo.repo_name.split(",").map((r) => r.trim());

        reposNames.forEach((singleName) => {
          const newReposEvents = events.filter(
            (event) =>
              new Date(event.created_at).getTime() > repo.last_contribution &&
              event.actor.login === user.github_user_name &&
              event.repo.name ===
                singleName.replace("https://api.github.com/repos/", "")
          );
          console.log('New repos events: ', newReposEvents);
          if (newReposEvents.length > 0) {
            reposToUpdate.push({
              ...repo,
              commits: repo.commits + newReposEvents.length,
              last_contribution: new Date(
                newReposEvents[0].created_at
              ).getTime(),
            });
          }
        });
      });
    });

    await neonDb.query(
      `
    UPDATE "Repository" AS r
    SET 
      commits = u.commits,
      last_contribution = u.last_contribution
    FROM (
      SELECT 
        UNNEST($1::text[]) AS id,
        UNNEST($2::int[]) AS commits,
        UNNEST($3::bigint[]) AS last_contribution
    ) AS u
    WHERE r.id = u.id;
    `,
      [
        reposToUpdate.map((r) => r.id),
        reposToUpdate.map((r) => r.commits),
        reposToUpdate.map((r) => r.last_contribution),
      ]
    );
  }
}
