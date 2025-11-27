import { IChainProvider } from "../../interfaces/providers/chain";
import axios from "axios";
import { ContractInfo } from "../../types/chain";
import { createRateLimiter } from "../../utils/resilienceMethods";
import { neonDb } from "../neon";

export class ChainProvider implements IChainProvider {
  private limiter = createRateLimiter(1000);
  constructor() {}

  public async getContracts(chainId: string, accounts: string[]) {
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
                `https://data-api.avax.network/v1/chains/${chainId}/contracts/${account}/deployments`
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
          console.error("Error fetching contract details:", c.reason);
        }
      });
    }
    return { dbContracts, apiContracts };
  }
}
