import { Request, Response } from 'express';
import GithubMetrics from '../services/githubMetrics';

const githubMetrics = new GithubMetrics();

export const getUserEvents = async (req: Request, res: Response) => {
  const user = req.params.user;
  if (!user) return res.status(400).json({ error: 'user param required' });

  try {
    const events = await githubMetrics.getEventsByUser(user);
    return res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch events', details: String(err) });
  }
};