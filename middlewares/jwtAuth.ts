import { Request, Response, NextFunction } from "express";

type AuthedRequest = Request & {
  user?: { id: string };
};

const BUILDER_HUB_URL: string | undefined =
  process.env.AVALANCHE_BUILDER_HUB_URL;

export async function jwtAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!BUILDER_HUB_URL) {
    res
      .status(500)
      .json({ error: "Error at validate jwt token" });
    return;
  }

  const authHeader: string | undefined = req.header("authorization");
  if (!authHeader) {
    res.status(401).json({ error: "missing authorization header" });
    return;
  }

  try {
    const response = await fetch(
      `${BUILDER_HUB_URL}/api/validate-jwt-token`,
      {
        method: "POST",
        headers: {
          authorization: authHeader,
          "content-type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const text: string = await response.text();
      res.status(401).json({ error: "invalid token", details: text });
      return;
    }

    const data: { valid: boolean, message: string, sub: string } = await response.json();
    console.log('TOKEN DATA: ', data)
    if (data.valid) {
      (req as AuthedRequest).user = { id: data.sub };
      next()
    } else {
      res.status(401).json({ error: "invalid token", details: data.message });
    }
  } catch (err: unknown) {
    res.status(401).json({
      error: "token validation service error",
      details: String(err),
    });
  }
}
