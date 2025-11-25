import { Request, Response } from 'express';
import GithubMetrics from '../services/githubMetrics';

const githubMetrics = new GithubMetrics();

export const getUsersContributions = async (req: Request, res: Response) => {
  const { users, projects } = req.body;

  if (!users || !Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'users field is required and must be an array' });
  }

  if (!projects || !Array.isArray(projects) || projects.length === 0) {
    return res.status(400).json({ error: 'projects field is required and must be an array' });
  }

  try {
    const events = await githubMetrics.getContributionsByUsersAndProjects(users, projects);
    return res.json(events);
  } catch (err) {
    return res.status(500).json({
      error: 'failed to fetch contributions',
      details: String(err)
    });
  }
};
