import axios from "axios";
import { ChainData as ChainDataType, ContractInfo } from "../types/chain";
import { neonDb } from "./neon";

export default class ContractsService {
  constructor() {}

  public async getContractsByAddresses(accounts: string[]): Promise<ChainDataType> {
    let data: ChainDataType = {};
    const currentContracts = await neonDb.query(
      'SELECT * FROM "Contract" WHERE deployer_address = ANY($1)',
      [accounts]
    );
    const contractsPromises = accounts.filter((account) => !!account).map(
      async (account) =>
        (
          await axios.get<any>(
            `https://data-api.avax.network/v1/chains/43114/contracts/${account}/deployments`
          )
        ).data
    );
    //Fill contract data
    const settledContracts = await Promise.allSettled(contractsPromises);
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const result = settledContracts[i];
      if (result && result.status === "fulfilled") {
        const newContracts = result.value.contracts.filter(
          (contract: ContractInfo) =>
            contract.address &&
            !currentContracts.some((cc: any) => cc.address === contract.address)
        );
        const contractsDetailsPromises = newContracts.map(
          async (contract: any) =>
            (
              await axios.get<any>(
                `https://data-api.avax.network/v1/chains/43114/contracts/${contract.address}/transactions:getDeployment`
              )
            ).data
        );
        const settledContractsDetails = await Promise.allSettled(
          contractsDetailsPromises
        );
        for (let j = 0; j < newContracts.length; j++) {
          const contract = newContracts[j];
          const detailResult = settledContractsDetails[j];
          if (detailResult.status === "fulfilled") {
            if (!data[account]) data[account] = { contracts: [] };
            data[account].contracts.push({
              address: contract.address,
              deployerAddress: contract.deploymentDetails.deployerAddress,
              timestamp: detailResult.value.nativeTransaction.blockTimestamp,
            });
            await neonDb.query(
              'INSERT INTO "Contract" (address, deployer_address, timestamp) VALUES ($1, $2, $3)',
              [
                contract.address,
                contract.deploymentDetails.deployerAddress,
                detailResult.value.nativeTransaction.blockTimestamp,
              ]
            );
          } else {
            console.warn(
              `Failed to fetch deployment details for contract ${contract.address} of account ${account}:`,
              detailResult.reason
            );
          }
        }
        if (!data[account]) {
          data[account] = { contracts: [] };
        }
        data[account].contracts = [
          ...currentContracts.filter(
            (cc: any) => cc.deployer_address === account
          ),
          ...data[account]?.contracts,
        ];
      } else {
        console.warn(
          `Failed to fetch contracts for account ${account}:`,
          result?.reason ?? ''
        );
      }
    }

    return data;
  }
}
