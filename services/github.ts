import { ContributionsData, Event, ProjectRepository } from "../types/github";
import { User } from "../types/user";
import { Project } from "../types/project";
import { IGithubProvider } from "../interfaces/providers/github";
import { ParamsService } from "./infrastructure/params";
import { neonDb } from "./neon";
import { performance } from "perf_hooks";

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

    console.log("Returning data:");
    const dataStartTime = performance.now();
    
    // Create indexed maps for O(1) lookups: user_id -> repos[] and username -> user
    const mapStartTime = performance.now();
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
    const mapEndTime = performance.now();
    console.log(`Maps creation took ${(mapEndTime - mapStartTime).toFixed(2)}ms`);
    
    const buildingStartTime = performance.now();
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
    const buildingEndTime = performance.now();
    console.log(`Data building took ${(buildingEndTime - buildingStartTime).toFixed(2)}ms`);
    
    const dataEndTime = performance.now();
    console.log(`Total returning data execution time: ${(dataEndTime - dataStartTime).toFixed(2)}ms`);
    
    return data;
  }

  private async insertNewRepos(
    repos: (ProjectRepository & Project)[],
    events: Event[],
    users: User[]
  ) {
    const reposToInsert: (ProjectRepository & Project)[] = [];
    console.debug(`Preparing to insert new repositories...`);
    
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
      console.debug(`Processing user: ${user.github_user_name}`);
      const userEvents = eventMap.get(user.github_user_name);
      
      if (!userEvents) {
        return;
      }
      
      repos.forEach((repo) => {
        const reposNames = repo.repo_name.split(",").map((r) => r.trim());

        reposNames.forEach((singleName) => {
          const cleanRepoName = singleName.replace("https://api.github.com/repos/", "");
          const repoEvents = userEvents.get(cleanRepoName);
          
          if (repoEvents && repoEvents.length > 0) {
            reposToInsert.push({
              id: "",
              repo_id: repoEvents[0].repo.id,
              user_id: user.id,
              first_contribution: new Date(
                repoEvents[repoEvents.length - 1].created_at
              ).getTime(),
              last_contribution: new Date(repoEvents[0].created_at).getTime(),
              commits: repoEvents.length,
              repo_name: singleName,
              project_name: repo.project_name,
              project_id: repo.project_id,
            });
          }
        });
      });
    });
    console.debug(`Prepared ${reposToInsert.length} repositories to insert.`);

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
          const cleanRepoName = singleName.replace("https://api.github.com/repos/", "");
          const repoEvents = userEvents.get(cleanRepoName);
          
          if (repoEvents && repoEvents.length > 0) {
            const newReposEvents = repoEvents.filter(
              (event) => new Date(event.created_at).getTime() > repo.last_contribution
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

    const updateStartTime = performance.now();
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
    const updateEndTime = performance.now();
    console.log(`Database update took ${(updateEndTime - updateStartTime).toFixed(2)}ms`);
  }
}
