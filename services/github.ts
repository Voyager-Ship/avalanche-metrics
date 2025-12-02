import { ContributionsData, Event, ProjectRepository } from "../types/github";
import { User } from "../types/user";
import { Project } from "../types/project";
import { IGithubProvider } from "../interfaces/providers/github";
import { neonDb } from "./neon";

export default class GithubMetrics {
  constructor(private githubProvider: IGithubProvider) {}

  public async getContributionsByUsersAndProjects(
    githubUsersNames: string[],
    projectsNames: string[]
  ): Promise<ContributionsData> {
    const data: ContributionsData = {};

    if (githubUsersNames.length === 0 && projectsNames.length === 0) {
      const dbUsers = await this.githubProvider.fetchUsersFromDb();
      const dbProjects = await this.githubProvider.fetchProjectsFromDb();
      const dbGithubUsersNames: string[] = [];
      const dbProjectsNames: string[] = [];

      for (let i = 0; i < Math.max(dbUsers.length, dbProjects.length); i++) {
        if (i < dbUsers.length && dbUsers[i].github_user_name) {
          dbGithubUsersNames.push(dbUsers[i].github_user_name);
        }
        if (i < dbProjects.length && dbProjects[i].project_name) {
          dbProjectsNames.push(dbProjects[i].project_name);
        }
      }
      if (dbGithubUsersNames.length === 0 && dbProjectsNames.length === 0) {
        return data;
      } else {
        return this.getContributionsByUsersAndProjects(
          dbGithubUsersNames,
          dbProjectsNames
        );
      }
    } else if (githubUsersNames.length === 0) {
      const dbUsers = await this.githubProvider.fetchUsersFromProjectsFromDb(projectsNames)
      const dbGithubUsersNames: string[] = [];
      dbUsers.forEach((user) => {
        if (user.github_user_name) {
          dbGithubUsersNames.push(user.github_user_name);
        }
      });
      if (dbGithubUsersNames.length === 0) {
        return data;
      } else {
        return this.getContributionsByUsersAndProjects(
          dbGithubUsersNames,
          projectsNames
        );
      }
    } else if (projectsNames.length === 0) {
      const dbProjects = await this.githubProvider.fetchProjectsFromDb();
      const dbProjectsNames: string[] = [];
      dbProjects.forEach((project) => {
        if (project.project_name) {
          dbProjectsNames.push(project.project_name);
        }
      });
      if (dbProjectsNames.length === 0) {
        return data;
      } else {
        return this.getContributionsByUsersAndProjects(
          githubUsersNames,
          dbProjectsNames
        );
      }
    } else {
      const { repos, events, users } =
        await this.githubProvider.getContributions(
          githubUsersNames,
          projectsNames
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
