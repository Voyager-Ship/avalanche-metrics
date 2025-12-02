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
  fetchUsersFromDb(): Promise<User[]>;
  fetchUsersFromProjectsFromDb(projects: string[]): Promise<User[]>;
  fetchProjectsFromDb(): Promise<Project[]>;
  fetchProjectsFromUsersFromDb(users: string[]): Promise<Project[]>;
}
