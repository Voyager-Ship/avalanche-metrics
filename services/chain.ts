import { IChainProvider } from "../interfaces/providers/chain";
import { ChainData as ChainDataType, ContractInfo } from "../types/chain";
import { neonDb } from "./neon";

export default class ContractsService {
  constructor(private chainProvider: IChainProvider) {}

  public async getContractsByAddresses(
    chainId: number,
    accounts: string[]
  ): Promise<ChainDataType> {
    let data: ChainDataType = {};

    const { dbContracts, apiContracts } = await this.chainProvider.getContracts(
      chainId,
      accounts
    );
    const newContracts = apiContracts.filter(
      (apiContract) =>
        !dbContracts.some(
          (dbContract) => dbContract.address === apiContract.address
        )
    );
    const newContractsWithIds = await this.insertNewContracts(chainId, newContracts);
    accounts.forEach((account) => {
      data[account] = [...newContractsWithIds, ...dbContracts];
    });
    return data;
  }

  private async insertNewContracts(chainId: number, newContracts: ContractInfo[]) {
    const results = await neonDb.query(
      `
    INSERT INTO "Contract" (
      address, 
      deployer_address, 
      timestamp,
      chain_id
    )
    SELECT * FROM UNNEST (
      $1::text[], 
      $2::text[], 
      $3::bigint[],
      $4::bigint[]
    )
    RETURNING id;
    `,
      [
        newContracts.map((r) => String(r.address)),
        newContracts.map((r) => r.deployerAddress),
        newContracts.map((r) => String(r.timestamp)),
        newContracts.map(() => chainId),
      ]
    );

    if (results.length !== newContracts.length) {
      throw new Error("Mismatch in inserted contracts length");
    }
    return newContracts.map((contract, index) => ({
      id: results[index].id,
      ...contract,
      chainId,
    }));
  }
}
