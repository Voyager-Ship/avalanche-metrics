import { ContractInfo } from "../../types/chain";

export interface IChainProvider {
  getContracts(
    chainId: string,
    accounts: string[]
  ): Promise<{ dbContracts: ContractInfo[]; apiContracts: ContractInfo[] }>;
}
