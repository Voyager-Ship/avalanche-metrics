import { ContributionsData, Event, ProjectRepository } from "../types/github";
import { User } from "../types/user";
import { Project } from "../types/project";
import { IGithubProvider } from "../interfaces/providers/github";
import { ParamsService } from "./infrastructure/params";
import { neonDb } from "./neon";

export default class GithubMetrics {
  private paramsService: ParamsService;

  constructor(private githubProvider: IGithubProvider) {
    this.paramsService = new ParamsService(githubProvider);
  }

  public async getContributionsByUsersAndProjects(
    githubUsersNames: string[],
    projectsNames: string[]
  ): Promise<ContributionsData> {
    const data: ContributionsData = {};

    const {
      githubUsersNames: safeGithubUsersNames,
      projectsNames: safeProjectsNames,
    } = await this.paramsService.fillParams(githubUsersNames, projectsNames);

    const { repos, events, users } = await this.githubProvider.getContributions(
      safeGithubUsersNames,
      safeProjectsNames
    );

    let newRepos = repos.filter((repo) => repo.repo_id == null);
    newRepos = await this.insertNewRepos(newRepos, events, users);

    let currentRepos = repos.filter((repo) => repo.repo_id != null);
    await this.updateCurrentRepos(currentRepos, events, users);

    safeGithubUsersNames.forEach((userName) => {
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
