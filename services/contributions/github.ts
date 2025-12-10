import { ContributionsData, Event, ProjectRepository } from "../../types/github";
import { User } from "../../types/user";
import { Project } from "../../types/project";
import { IGithubProvider } from "../../interfaces/providers/github";
import { ParamsService } from "../infrastructure/params";
import { neonDb } from "./neon";

export default class GithubMetrics {
  private paramsService: ParamsService;
  private readonly MAX_USERS_PER_REQUEST = 1000;

  constructor(private githubProvider: IGithubProvider) {
    this.paramsService = new ParamsService(githubProvider);
  }

  public async getContributionsByUsersAndProjects(
    githubUsersNames: string[],
    projectsNames: string[],
    page: number
  ): Promise<ContributionsData> {
    const data: ContributionsData = {};

    // Implement pagination for users
    const skip = (page - 1) * this.MAX_USERS_PER_REQUEST;
    const paginatedUsers = githubUsersNames.slice(skip, skip + this.MAX_USERS_PER_REQUEST);

    const {
      githubUsersNames: safeGithubUsersNames,
      projectsNames: safeProjectsNames,
    } = await this.paramsService.fillParams(paginatedUsers, projectsNames, page);

    const { repos, events, users } = await this.githubProvider.getContributions(
      safeGithubUsersNames,
      safeProjectsNames
    );

    let newRepos = repos.filter((repo) => repo.repo_id == null);
    console.debug(`${newRepos.length} new repos prepared to insert.`);
    newRepos = await this.insertNewRepos(newRepos, events, users);

    let currentRepos = repos.filter((repo) => repo.repo_id != null);
    await this.updateCurrentRepos(currentRepos, events, users);

    const newReposMap = new Map<string, (ProjectRepository & Project)[]>();
    newRepos.forEach((repo) => {
      if (!newReposMap.has(repo.user_id)) {
        newReposMap.set(repo.user_id, []);
      }
      newReposMap.get(repo.user_id)!.push(repo);
    });

    const currentReposMap = new Map<string, (ProjectRepository & Project)[]>();
    currentRepos.forEach((repo) => {
      if (!currentReposMap.has(repo.user_id)) {
        currentReposMap.set(repo.user_id, []);
      }
      currentReposMap.get(repo.user_id)!.push(repo);
    });

    // Create user map for O(1) lookups: username -> user
    const userMap = new Map<string, User>();
    users.forEach((user) => {
      userMap.set(user.github_user_name, user);
    });

    safeGithubUsersNames.forEach((userName) => {
      const user = userMap.get(userName);
      if (user) {
        data[user.github_user_name] = [
          ...(newReposMap.get(user.id) || []),
          ...(currentReposMap.get(user.id) || []),
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

    // Create repo name map for quick lookup: repo_name -> repo object
    const repoMap = new Map<string, (ProjectRepository & Project)>();
    repos.forEach((repo) => {
      const reposNames = repo.repo_name.split(",").map((r) => r.trim());
      reposNames.forEach((singleName) => {
        const cleanName = singleName.replace("https://api.github.com/repos/", "");
        repoMap.set(cleanName, repo);
      });
    });

    // Create user map for O(1) lookups
    const userMap = new Map<string, User>();
    users.forEach((user) => {
      userMap.set(user.github_user_name, user);
    });

    // Group events by user and repo name (only iterate events once)
    const eventsByUserRepo = new Map<string, Map<string, Event[]>>();
    events.forEach((event) => {
      if (!eventsByUserRepo.has(event.actor.login)) {
        eventsByUserRepo.set(event.actor.login, new Map());
      }
      const userMap = eventsByUserRepo.get(event.actor.login)!;
      if (!userMap.has(event.repo.name)) {
        userMap.set(event.repo.name, []);
      }
      userMap.get(event.repo.name)!.push(event);
    });

    // Process only user-repo combinations that have events
    eventsByUserRepo.forEach((repoEvents, userName) => {
      const user = userMap.get(userName);
      if (!user) return;

      repoEvents.forEach((events, repoName) => {
        const repo = repoMap.get(repoName);
        if (!repo) return;

        reposToInsert.push({
          id: "",
          repo_id: events[0].repo.id,
          user_id: user.id,
          first_contribution: new Date(
            events[events.length - 1].created_at
          ).getTime(),
          last_contribution: new Date(events[0].created_at).getTime(),
          commits: events.length,
          repo_name: repoName,
          project_name: repo.project_name,
          project_id: repo.project_id,
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
    console.debug(`${result.length} repos inserted into the database.`);
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

    console.debug(`${reposToInsert.length} project repos inserted into the database.`);
    return reposToInsert;
  }

  private async updateCurrentRepos(
    repos: (ProjectRepository & Project)[],
    events: Event[],
    users: User[]
  ) {
    const reposToUpdate: (ProjectRepository & Project)[] = [];

    // Create indexed event map for O(1) lookups: user_login -> repo_name -> events[]
    const eventMap = new Map<string, Map<string, Event[]>>();
    events.forEach((event) => {
      if (!eventMap.has(event.actor.login)) {
        eventMap.set(event.actor.login, new Map());
      }
      const userEvents = eventMap.get(event.actor.login)!;
      if (!userEvents.has(event.repo.name)) {
        userEvents.set(event.repo.name, []);
      }
      userEvents.get(event.repo.name)!.push(event);
    });

    users.forEach((user) => {
      const userEvents = eventMap.get(user.github_user_name);

      if (!userEvents) {
        return;
      }

      repos.forEach((repo) => {
        const reposNames = repo.repo_name.split(",").map((r) => r.trim());

        reposNames.forEach((singleName) => {
          const cleanRepoName = singleName.replace(
            "https://api.github.com/repos/",
            ""
          );
          const repoEvents = userEvents.get(cleanRepoName);

          if (repoEvents && repoEvents.length > 0) {
            const newReposEvents = repoEvents.filter(
              (event) =>
                new Date(event.created_at).getTime() > repo.last_contribution
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
