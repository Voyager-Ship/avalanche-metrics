import { Request, Response } from 'express';
import GithubMetrics from '../services/githubMetrics';

const githubMetrics = new GithubMetrics();


export const getUsersContributions = async (req: Request, res: Response) => {
  const users = req.query.users?.toString().split(',');
  if (!users) return res.status(400).json({ error: 'users query param required' });

  try {
    const events = await githubMetrics.getContributionsByUsers(users);
    return res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch contributions', details: String(err) });
  }
};
