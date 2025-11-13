export type ChainData = { [key: string]: ChainDataResponse };

type ChainDataResponse = {
  contracts: ContractInfo[]
}

export type ContractInfo = {
  address: string;
  deployerAddress: string;
  timestamp: string;
}