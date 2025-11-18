import { neonDb } from "./neon";
import { MergeData } from "../types/merge";
import GithubMetrics from "./githubMetrics";
import ChainData from "./chainData";

const githubMetrics = new GithubMetrics();
const chainData = new ChainData();

export default class Merge {
  constructor() {}
  public async getMergeData(users: string[], repos: string[]) {
    const data: MergeData = {};
    const dbUsers = await neonDb.query<any>(
      'SELECT * FROM "User" WHERE github_user_name = ANY($1)',
      [users]
    );
    const badges = await neonDb.query(
      'SELECT * FROM "UserBadge" ub JOIN "Badge" b on ub.badge_id = b.id WHERE user_id = ANY($1)',
      [dbUsers.map((user) => user.id)]
    );
    const contributions = await githubMetrics.getContributionsByUsersAndRepos(
      dbUsers.map((user) => user.github_user_name),
      repos
    );
    const contracts = await chainData.getChainDataByUsers(
      dbUsers.map((user) => user.address)
    );
    console.log(badges)
    dbUsers.forEach((user) => {
      data[user.github_user_name] = {
        contributionsData: contributions[user.github_user_name],
        chainData: contracts[user.address]?.contracts ?? [],
        badgesData: badges
          .filter((badge) => badge.user_id == user.id)
          .map((badge) => ({
            id: badge.id,
            name: badge.name,
            description: badge.description,
            category: badge.category,
            points: badge.points,
            awarded_at: new Date(badge.awarded_at).getTime().toString(),
          })),
      };
    });
    return data;
  }
}
