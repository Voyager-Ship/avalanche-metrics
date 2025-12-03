import { IChainProvider } from "../../../interfaces/providers/chain";
import { ContractInfo } from "../../../types/chain";

export class MockedChainProvider implements IChainProvider {
  constructor() {}

  public async getContracts(chainId: number, accounts: string[]) {
    const mockedContracts: ContractInfo[] = [];

    accounts.forEach((account, accountIndex) => {
      for (let i = 0; i < 1000; i++) {
        mockedContracts.push({
          address: `0xMockedAddress${accountIndex}_${i}`,
          deployerAddress: account,
          timestamp: (Date.now() - i * 1000).toString(), // Convert timestamp to string
        });
      }
    });

    return { dbContracts: mockedContracts, apiContracts: mockedContracts };
  }
}
