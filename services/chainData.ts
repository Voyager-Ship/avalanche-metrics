import axios from "axios";
import { ChainData as ChainDataType, ContractInfo } from "../types/chain";
import { neonDb } from "./neon";
import { createRateLimiter } from "../utils/resilienceMethods";

export default class ContractsService {
  private limiter = createRateLimiter(100);
  constructor() {}

  public async getContractsByAddresses(
    accounts: string[]
  ): Promise<ChainDataType> {
    let data: ChainDataType = {};

    const { dbContracts, apiContracts } = await this.fetchContracts(accounts);
    const newContracts = apiContracts.filter(
      (apiContract) =>
        !dbContracts.some(
          (dbContract) => dbContract.address === apiContract.address
        )
    );
    const newContractsWithIds = await this.insertNewContracts(newContracts);
    accounts.forEach((account) => {
      data[account] = [...newContractsWithIds, ...dbContracts];
    });
    return data;
  }
  private async fetchContracts(accounts: string[]) {
    const dbContracts = await neonDb.query<ContractInfo>(
      'SELECT * FROM "Contract" WHERE deployer_address = ANY($1)',
      [accounts]
    );

    const apiContracts: ContractInfo[] = [];

    const contractsPromises = accounts
      .filter((account) => !!account)
      .map(async (account) =>
        this.limiter(
          async () =>
            (
              await axios.get<{ contracts: any[] }>(
                `https://data-api.avax.network/v1/chains/43114/contracts/${account}/deployments`
              )
            ).data
        )
      );
    const contractsResults = await Promise.allSettled(contractsPromises);
    const fullFilledContractsResults: any[] = [];

    contractsResults.forEach((result) => {
      if (result.status === "fulfilled") {
        fullFilledContractsResults.push(...result.value.contracts);
      } else {
        console.error("Error fetching contracts:", result.reason);
      }
    });
    const contractsDetailsPromises = fullFilledContractsResults.map(
      async (contract: any) =>
        this.limiter(
          async () =>
            (
              await axios.get<any>(
                `https://data-api.avax.network/v1/chains/43114/contracts/${contract.address}/transactions:getDeployment`
              )
            ).data
        )
    );
    const contractsDetailsResults = await Promise.allSettled(
      contractsDetailsPromises
    );
    if (contractsDetailsResults.length !== fullFilledContractsResults.length) {
      throw new Error("Mismatch in contracts details results length");
    } else {
      contractsDetailsResults.forEach((c, index) => {
        if (c.status === "fulfilled") {
          apiContracts.push({
            address: fullFilledContractsResults[index].address,
            deployerAddress: c.value.nativeTransaction.from.address,
            timestamp: c.value.nativeTransaction.blockTimestamp,
          });
        } else {
          console.error("Error fetching contract details:", c.reason)
        }
      });
    }
    return { dbContracts, apiContracts };
  }

  private async insertNewContracts(newContracts: ContractInfo[]) {
    const results = await neonDb.query(
      `
    INSERT INTO "Contract" (
      address, 
      deployer_address, 
      timestamp
    )
    SELECT * FROM UNNEST (
      $1::text[], 
      $2::text[], 
      $3::bigint[]
    )
    RETURNING id;
    `,
      [
        newContracts.map((r) => String(r.address)),
        newContracts.map((r) => r.deployerAddress),
        newContracts.map((r) => String(r.timestamp)),
      ]
    );

    if (results.length !== newContracts.length) {
      throw new Error("Mismatch in inserted contracts length");
    }
    return newContracts.map((contract, index) => ({
      id: results[index].id,
      ...contract,
    }));
  }
}
