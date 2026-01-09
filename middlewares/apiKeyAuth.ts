import { Request, Response, NextFunction } from 'express';
import { AUTH_API_KEY } from '../constants/constants';

type ExcludedRoute = {
  method: string;
  path: RegExp;
};

const JWT_AUTH_ROUTES: ExcludedRoute[] = [
  { method: 'POST', path: /^\/notifications\/get\/inbox$/ },
  { method: 'POST', path: /^\/notifications\/read$/ },
];

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const useJwt = JWT_AUTH_ROUTES.some(
    (route) =>
      route.method === req.method &&
      route.path.test(req.path)
  );

  if (useJwt) {
    return next();
  }

  const header = req.header('x-api-key');
  if (!header) {
    return res.status(401).json({ error: 'missing api key' });
  }

  const envKey = AUTH_API_KEY;
  if (!envKey) {
    return res
      .status(500)
      .json({ error: 'server misconfiguration: API_KEY not set' });
  }

  if (header !== envKey) {
    return res.status(401).json({ error: 'invalid api key' });
  }

  (req as any).apiKey = header;
  return next();
}
