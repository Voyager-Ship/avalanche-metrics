import axios from "axios";
import { ContributionsData, Event, ProjectRepository } from "../types/github";
import { neonDb } from "./neon";

export default class GithubMetrics {
  constructor() {}

  public async getContributionsByUsersAndRepos(
    users: string[],
    repos: string[]
  ): Promise<ContributionsData> {
    const data: ContributionsData = {};
    const currentRepos = await neonDb.query<ProjectRepository>(
      'SELECT * FROM "Repository" WHERE repo_name = ANY($1)',
      [repos]
    );
    const eventsPromises = users.map(
      async (user) =>
        (
          await axios.get<Event[]>(
            `https://api.github.com/users/${user}/events`
          )
        ).data
    );
    const settled = await Promise.allSettled(eventsPromises);
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const result = settled[i];
      if (result.status === "fulfilled") {
        const userId = await this.ensureUserId(user);
        if (!userId) continue;
        const currentUserRepos = currentRepos.filter(
          (repo) => repo.user_id == userId
        );
        data[user] = currentUserRepos.map((repo) => {
          const newRepoContributions = result.value.filter(
            (e) =>
              e?.repo.name === repo.repo_name &&
              new Date(e?.created_at).getTime() >
                new Date(repo.last_contribution).getTime()
          );
          neonDb.query(
            `
  UPDATE "Repository"
  SET 
    commits = commits + $1,
    last_contribution = $2
  WHERE id = $3
  `,
            [
              newRepoContributions.length,
              newRepoContributions[0]
                ? newRepoContributions[0]?.created_at
                : repo.last_contribution,
              repo.id,
            ]
          );

          return {
            id: repo.id,
            last_contribution: newRepoContributions[0]
              ? newRepoContributions[0]?.created_at
              : repo.last_contribution,
            first_contribution: repo.first_contribution,
            repo_id: repo.repo_id,
            repo_name: repo.repo_name,
            user_id: repo.user_id,
            commits: repo.commits + newRepoContributions.length,
          };
        });
        const newRepos = repos.filter((repo) =>
          result.value.some((r) => r.actor.login == user && r.repo.name == repo && !currentRepos.some((cr) => cr.repo_name == repo && cr.user_id == userId))
        );
        for (const repo of newRepos) {
          const repoContributions = result.value
            .filter((e) => e?.repo.name === repo && e.actor.login == user)
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
          const id = await neonDb.query<{ id: string }>(
            'INSERT INTO "Repository" (last_contribution, first_contribution, repo_id, repo_name, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [
              new Date(repoContributions[0]?.created_at).getTime(),
              new Date(
                repoContributions[repoContributions.length - 1]?.created_at
              ).getTime(),
              repoContributions[0]?.repo.id,
              repo,
              userId,
            ]
          );
          data[user]?.push({
            id: id[0].id,
            first_contribution: new Date(
              repoContributions[repoContributions.length - 1]?.created_at
            )
              .getTime()
              .toString(),
            last_contribution: new Date(repoContributions[0]?.created_at)
              .getTime()
              .toString(),
            repo_id: repoContributions[0]?.repo.id,
            repo_name: repo,
            user_id: userId,
            commits: repoContributions.length,
          });
        }
      }
    }
    return data;
  }
  private async ensureUserId(
    githubUserName: string
  ): Promise<string | undefined> {
    const found = await neonDb.query<{ id: string }>(
      'SELECT id FROM "User" WHERE github_user_name = $1 LIMIT 1',
      [githubUserName]
    );
    if (found.length > 0) return found[0].id;

    const inserted = await neonDb.query<{ id: string }>(
      'INSERT INTO "User" (github_user_name) VALUES ($1) RETURNING id',
      [githubUserName]
    );
    if (inserted.length > 0) return inserted[0].id;
  }
}
