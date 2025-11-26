
import { Event, ProjectRepository } from "../../types/github";
import { User } from "../../types/user";
import { Project } from "../../types/project";

export interface IGithubProvider {
  getContributions(
    githubUsersNames: string[],
    projectsNames: string[]
  ): Promise<{
    repos: (ProjectRepository & Project)[];
    events: Event[];
    users: User[];
  }>;
}
