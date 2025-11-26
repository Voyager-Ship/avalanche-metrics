import { Request, Response } from 'express';
import ContractsService from '../services/chain';
import { ChainProvider } from '../services/providers/chain';

const contractsService = new ContractsService(new ChainProvider());

export const getAdressesContracts = async (req: Request, res: Response) => {
  const { accounts } = req.body;

  if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    return res.status(400).json({ error: 'accounts field is required and must be an array' });
  }

  try {
    const events = await contractsService.getContractsByAddresses(accounts);
    return res.json(events);
  } catch (err) {
    return res.status(500).json({
      error: 'failed to fetch contracts',
      details: String(err)
    });
  }
};
