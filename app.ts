import express from "express";
import indexRouter from "./routes/index";
import { apiKeyAuth } from "./middlewares/apiKeyAuth";
import { startSendNotificationsWorker } from "./wokers/sendNotifications";
import cors from "cors";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");
const app = express();

const allowedOrigins: string[] = [
  "https://avalanche-docs-eight.vercel.app",
  "https://build.avax.network",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: (origin: string | undefined, callback) => {
      // Permite requests sin Origin (curl, health checks, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  }),
);


app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: false, limit: "500mb" }));
app.use(apiKeyAuth);

// Mount routes
app.use("/", indexRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
  console.debug(`Server listening on http://localhost:${port}`);
});

const baseUrl: string | undefined = process.env.APP_BASE_URL;

if (!baseUrl) {
  throw new Error("APP_BASE_URL is not defined");
}

startSendNotificationsWorker({
  endpointUrl: `${baseUrl}/notifications/send`,
  intervalMs: 60 * 1000,
  timeoutMs: 30 * 1000,
});

export default app;
