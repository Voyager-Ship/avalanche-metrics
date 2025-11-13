// ...existing code...
import { Request, Response, NextFunction } from 'express';
import { MASTER_API_KEY } from '../constants/constants';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {

  const header = req.header('x-api-key');
  if (!header) return res.status(401).json({ error: 'missing api key' });

  let key = header;

  const envKey = MASTER_API_KEY;
  if (!envKey) return res.status(500).json({ error: 'server misconfiguration: API_KEY not set' });

  if (key !== envKey) return res.status(401).json({ error: 'invalid api key' });

  // attach key info if needed
  (req as any).apiKey = key;
  return next();
}