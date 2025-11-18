import { ContractInfo } from "./chain";
import { ProjectRepository } from "./github";
import { Badge } from "./badges";

export type MergeData = {
  [key: string]: {
    chainData: ContractInfo[];
    contributionsData: ProjectRepository[];
    badgesData: Badge[];
  };
};
