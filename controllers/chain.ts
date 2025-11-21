import { Request, Response } from 'express';
import ContractsService from '../services/chainData'

const contractsService = new ContractsService();

export const getAdressesContracts = async (req: Request, res: Response) => {
  const addresses = req.query.accounts?.toString().split(',');
  if (!addresses) return res.status(400).json({ error: 'accounts query param required' });

  try {
    const events = await contractsService.getContractsByAddresses(addresses);
    return res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch contracts', details: String(err) });
  }
};