import { neonDb } from "./neon";
import { MergeData } from "../types/merge";
import GithubMetrics from "./github";
import ContractsService from "./chain";
import GithubProvider from "./providers/github";
import { ChainProvider } from "./providers/chain";

const githubMetrics = new GithubMetrics(new GithubProvider());
const chainData = new ContractsService(new ChainProvider());

export default class Activity {
  constructor() {}
  public async getUsersActivity(users: string[], projects: string[]) {
    const data: MergeData = {};
    const usersBadgesData = await neonDb.query<any>(
      `SELECT u.*, ub.badge_id, b.id as badge_id, b.name, b.description, b.category, b.points, ub.evidence, ub.awarded_at
   FROM "User" u
   LEFT JOIN "UserBadge" ub ON u.id = ub.user_id
   LEFT JOIN "Badge" b ON ub.badge_id = b.id
   WHERE u.github_user_name = ANY($1)`,
      [users]
    );

    const dbUsers = usersBadgesData.map((row) => ({
      id: row.id,
      github_user_name: row.github_user_name,
      address: row.address,
    }));

    const badges = usersBadgesData
      .filter((row) => row.badge_id !== null)
      .map((row) => ({
        id: row.badge_id,
        name: row.name,
        description: row.description,
        category: row.category,
        points: row.points,
        user_id: row.id,
        awarded_at: row.awarded_at,
        evidence: row.evidence.map((e: any) => ({
          id: e.id,
        })),
      }));

    const contributions =
      await githubMetrics.getContributionsByUsersAndProjects(
        dbUsers.map((user) => user.github_user_name),
        projects
      );
    const mainnetContracts = await chainData.getContractsByAddresses(
      43114,
      dbUsers
        .filter((dbUsers) => dbUsers.address != null)
        .map((user) => user.address)
    );
    const testnetContracts = await chainData.getContractsByAddresses(
      43113,
      dbUsers
        .filter((dbUsers) => dbUsers.address != null)
        .map((user) => user.address)
    );
    dbUsers.forEach((user) => {
      data[user.github_user_name] = {
        contributionsData: contributions[user.github_user_name],
        chainData: mainnetContracts[user.address!] ?? [],
        badgesData: badges
          .filter((badge) => badge.user_id == user.id)
          .map((badge) => ({
            id: badge.id,
            name: badge.name,
            description: badge.description,
            category: badge.category,
            points: badge.points,
            awarded_at: new Date(badge.awarded_at).getTime().toString(),
            evidence: badge.evidence,
          })),
      };
    });
    return data;
  }
}
