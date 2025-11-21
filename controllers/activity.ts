import { Request, Response } from 'express';
import Activity from '../services/activity'
const merge = new Activity()

export const getUsersActivity = async (req: Request, res: Response) => {
  const users = req.query.users?.toString().split(',');
  const projects = req.query.projects?.toString().split(',');
  if (!users) return res.status(400).json({ error: 'users query param required' });
  if (!projects) return res.status(400).json({ error: 'projects query param required' });

  try {
    const events = await merge.getUsersActivity(users, projects);
    return res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch contributions', details: String(err) });
  }
};