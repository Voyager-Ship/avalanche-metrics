import { Request, Response } from 'express';
import GithubMetrics from '../services/github';
import GithubProvider from '../services/providers/github';

const githubMetrics = new GithubMetrics(new GithubProvider());

export const getUsersContributions = async (req: Request, res: Response) => {
  const { users, projects } = req.body;

  if (!users || !Array.isArray(users)) {
    return res.status(400).json({ error: 'users field is required and must be an array' });
  }

  if (!projects || !Array.isArray(projects)) {
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
