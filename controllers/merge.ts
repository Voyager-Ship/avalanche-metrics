import { Request, Response } from 'express';
import Merge from '../services/merge'
const merge = new Merge()

export const getMergeData = async (req: Request, res: Response) => {
  const users = req.query.users?.toString().split(',');
  const repos = req.query.repos?.toString().split(',');
  if (!users) return res.status(400).json({ error: 'users query param required' });
  if (!repos) return res.status(400).json({ error: 'repos query param required' });

  try {
    const events = await merge.getMergeData(users, repos);
    return res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch contributions', details: String(err) });
  }
};