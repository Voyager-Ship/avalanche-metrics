import { Request, Response } from "express";
import GithubMetrics from "../../services/contributions/github";
import GithubProvider from "../../services/providers/github";
import MockedGithubProvider from "../../services/providers/test/github";
import { TEST_MODE } from "../../constants/constants";

const githubMetrics = new GithubMetrics(new GithubProvider());
const mockedGithubMetrics = new GithubMetrics(new MockedGithubProvider(100000));

export const getUsersContributions = async (req: Request, res: Response) => {
  const { users, projects, page = 1 } = req.body;

  if (!users || !Array.isArray(users)) {
    return res
      .status(400)
      .json({ error: "users field is required and must be an array" });
  }

  if (!projects || !Array.isArray(projects)) {
    return res
      .status(400)
      .json({ error: "projects field is required and must be an array" });
  }

  try {
    if (TEST_MODE) {
      const events = await mockedGithubMetrics.getContributionsByUsersAndProjects(
        users,
        projects,
        page
      );
      console.debug("Test mode active: returning mocked data.");
      return res.json(events);
    } else {
      const events = await githubMetrics.getContributionsByUsersAndProjects(
        users,
        projects,
        page
      );
      return res.json(events);
    }
  } catch (err) {
    return res.status(500).json({
      error: "failed to fetch contributions",
      details: String(err),
    });
  }
};
