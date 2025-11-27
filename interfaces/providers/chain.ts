import { ContractInfo } from "../../types/chain";

export interface IChainProvider {
  getContracts(
    chainId: number,
    accounts: string[]
  ): Promise<{ dbContracts: ContractInfo[]; apiContracts: ContractInfo[] }>;
}
