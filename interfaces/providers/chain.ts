import { ContractInfo } from "../../types/chain";

export interface IChainProvider {
  getContracts(
    accounts: string[]
  ): Promise<{ dbContracts: ContractInfo[]; apiContracts: ContractInfo[] }>;
}
