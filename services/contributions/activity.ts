import { neonDb } from "../infrastructure/neon";
import { MergeData } from "../../types/merge";
import GithubMetrics from "./github";
import ContractsService from "./chain";
import GithubProvider from "../providers/contributions/github";
import { ChainProvider } from "../providers/contributions/chain";
import { ParamsService } from "../infrastructure/params";
import { MAX_USERS_PER_REQUEST } from "../../constants/constants";

const githubMetrics = new GithubMetrics(new GithubProvider());
const chainData = new ContractsService(new ChainProvider());

export default class Activity {
  private paramsService: ParamsService;
  constructor() {
    this.paramsService = new ParamsService(new GithubProvider());
  }
  public async getUsersActivity(
    users: string[],
    projects: string[],
    page: number
  ): Promise<MergeData> {
    const data: MergeData = {};
    const { githubUsersNames, projectsNames } =
      await this.paramsService.fillParams(users, projects, page);
    
    console.debug("Getting user badges for:", githubUsersNames);
    const usersBadgesData = await neonDb.query<any>(
      `SELECT u.*, ub.badge_id, b.id as badge_id, b.name, b.description, b.category, b.points, ub.evidence, ub.awarded_at
   FROM "User" u
   LEFT JOIN "UserBadge" ub ON u.id = ub.user_id
   LEFT JOIN "Badge" b ON ub.badge_id = b.id
   WHERE u.github_user_name = ANY($1) LIMIT $2 OFFSET $3;`,
      [
        githubUsersNames,
        MAX_USERS_PER_REQUEST,
        (page - 1) * MAX_USERS_PER_REQUEST,
      ]
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

    console.debug("Getting contributions...");
    const contributions =
      await githubMetrics.getContributionsByUsersAndProjects(
        dbUsers.map((user) => user.github_user_name),
        projectsNames,
        page
      );
    console.debug("Getting mainnet contracts...");
    const mainnetContracts = await chainData.getContractsByAddresses(
      43114,
      dbUsers
        .filter((dbUsers) => dbUsers.address != null)
        .map((user) => user.address),
      page
    );
    console.debug("Getting testnet contracts...");
    const testnetContracts = await chainData.getContractsByAddresses(
      43113,
      dbUsers
        .filter((dbUsers) => dbUsers.address != null)
        .map((user) => user.address),
      page
    );
    dbUsers.forEach((user) => {
      data[user.github_user_name] = {
        contributionsData: contributions[user.github_user_name],
        chainData: [
          ...(mainnetContracts[user.address!] ?? []),
          ...(testnetContracts[user.address!] ?? []),
        ],
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
