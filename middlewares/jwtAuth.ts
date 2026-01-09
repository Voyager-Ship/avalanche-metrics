import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

type AuthedRequest = Request & {
  user?: { id: string };
};

const JWT_SECRET: string | undefined = process.env.JWT_SECRET;

export function jwtAuth(req: Request, res: Response, next: NextFunction): void {
  if (!JWT_SECRET) {
    res.status(500).json({ error: "server misconfiguration: JWT_SECRET not set" });
    return;
  }

  const authHeader: string | undefined = req.header("authorization") ?? undefined;
  if (!authHeader) {
    res.status(401).json({ error: "missing authorization header" });
    return;
  }

  const token: string = authHeader;

  try {
    const decoded: string | JwtPayload = jwt.verify(token, JWT_SECRET);

    // jwt.verify puede devolver string si el payload era string; nosotros esperamos objeto
    if (typeof decoded === "string") {
      res.status(401).json({ error: "invalid token payload" });
      return;
    }

    const sub: unknown = decoded.sub;
    if (typeof sub !== "string" || sub.length === 0) {
      res.status(401).json({ error: "token missing subject (sub)" });
      return;
    }

    (req as AuthedRequest).user = { id: sub };
    next();
  } catch (err: unknown) {
    res.status(401).json({ error: "invalid token", details: String(err) });
  }
}
