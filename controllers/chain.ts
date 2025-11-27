import { Request, Response } from "express";
import ContractsService from "../services/chain";
import { ChainProvider } from "../services/providers/chain";

const contractsService = new ContractsService(new ChainProvider());

export const getAdressesContracts = async (req: Request, res: Response) => {
  const { addresses, chainId } = req.body;

  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
    return res
      .status(400)
      .json({ error: "addresses field is required and must be an array" });
  }

  if (!chainId) {
    return res
      .status(400)
      .json({
        error: "chainId field is required and must be an string",
      });
  }

  try {
    const events = await contractsService.getContractsByAddresses(chainId, addresses);
    return res.json(events);
  } catch (err) {
    return res.status(500).json({
      error: "failed to fetch contracts",
      details: String(err),
    });
  }
};
