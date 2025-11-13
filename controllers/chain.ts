import { Request, Response } from 'express';
import ChainData from '../services/chainData'

const chainData = new ChainData();

export const getChainData = async (req: Request, res: Response) => {
  const accounts = req.query.accounts?.toString().split(',');
  if (!accounts) return res.status(400).json({ error: 'accounts query param required' });

  try {
    const events = await chainData.getChainDataByUsers(accounts);
    return res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch chain data', details: String(err) });
  }
};