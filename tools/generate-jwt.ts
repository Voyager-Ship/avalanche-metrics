import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "dev-secret";

const payload = {
  sub: "cm9m0ywnu0000sbtezudjuret",
  iat: Math.floor(Date.now() / 1000),
};

const token: string = jwt.sign(payload, JWT_SECRET, {
  expiresIn: "4h",
});
