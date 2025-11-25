import { Request, Response } from 'express';
import Activity from '../services/activity';

const merge = new Activity();

export const getUsersActivity = async (req: Request, res: Response) => {
  const { users, projects } = req.body;

  if (!users || !Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'users field is required and must be an array' });
  }

  if (!projects || !Array.isArray(projects) || projects.length === 0) {
    return res.status(400).json({ error: 'projects field is required and must be an array' });
  }

  try {
    const events = await merge.getUsersActivity(users, projects);
    return res.json(events);
  } catch (err) {
    return res.status(500).json({
      error: 'failed to fetch activity',
      details: String(err)
    });
  }
};
