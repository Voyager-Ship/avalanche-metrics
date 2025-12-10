import { Request, Response } from "express";
import ContractsService from "../../services/contributions/chain";
import { ChainProvider } from "../../services/providers/chain";
import { MockedChainProvider } from "../../services/providers/test/chain";
import { TEST_MODE } from "../../constants/constants";

const contractsService = new ContractsService(new ChainProvider());
const mockedContractsService = new ContractsService(new MockedChainProvider(100000));

export const getAdressesContracts = async (req: Request, res: Response) => {
  const { addresses, chainId, page = 1 } = req.body;

  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
    return res
      .status(400)
      .json({ error: "addresses field is required and must be an array" });
  }

  if (!chainId) {
    return res.status(400).json({
      error: "chainId field is required and must be an integer",
    });
  }

  try {
    if (TEST_MODE) {
      const contracts = await mockedContractsService.getContractsByAddresses(
        chainId,
        addresses,
        page
      );
      return res.json(contracts);
    } else {
      const contracts = await contractsService.getContractsByAddresses(
        chainId,
        addresses,
        page
      );
      return res.json(contracts);
    }
  } catch (err) {
    return res.status(500).json({
      error: "failed to fetch contracts",
      details: String(err),
    });
  }
};
