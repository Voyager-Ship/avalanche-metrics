export type ChainData = { [key: string]: ContractInfo[]};

export type ContractInfo = {
  address: string;
  deployerAddress: string;
  timestamp: string;
}