import { IGithubProvider } from "../../interfaces/providers/github";

export class ParamsService {
  constructor(private githubProvider: IGithubProvider) {}

  public async fillParams(
    githubUsersNames: string[],
    projectsNames: string[],
    page: number
  ): Promise<{
    githubUsersNames: string[];
    projectsNames: string[];
  }> {
    const params = {
      githubUsersNames,
      projectsNames,
    };
    if (githubUsersNames.length === 0 && projectsNames.length === 0) {
      const dbUsers = await this.githubProvider.fetchUsersFromDb(page);
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
        return params;
      } else {
        return {
          githubUsersNames: dbGithubUsersNames,
          projectsNames: dbProjectsNames,
        };
      }
    } else if (githubUsersNames.length === 0) {
      const dbUsers = await this.githubProvider.fetchUsersFromProjectsFromDb(
        projectsNames,
        page
      );
      const dbGithubUsersNames: string[] = [];
      dbUsers.forEach((user) => {
        if (user.github_user_name) {
          dbGithubUsersNames.push(user.github_user_name);
        }
      });
      if (dbGithubUsersNames.length === 0) {
        return params;
      } else {
        return {
          githubUsersNames: dbGithubUsersNames,
          projectsNames,
        };
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
        return params;
      } else {
        return {
          githubUsersNames,
          projectsNames: dbProjectsNames,
        };
      }
    } else {
      return params;
    }
  }
}
