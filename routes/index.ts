import { Router } from "express";
import { getUsersContributions } from "../controllers/contributions/github";
import { getAdressesContracts } from "../controllers/contributions/chain";
import { getUsersActivity } from "../controllers/contributions/activity";
import { createNotifications } from "../controllers/notifications/create";
import { sendNotifications } from "../controllers/notifications/send";
import { getNotifications } from "../controllers/notifications/get";
import { readNotifications } from "../controllers/notifications/read";
import {
  createInMemoryRateLimit,
  resolveAppKey,
} from "../middlewares/rateLimitter";

const router = Router();
router.use(
  createInMemoryRateLimit({
    requestsPerSecond: 20,
    burst: 40,
    idleTtlMs: 15 * 60_000,
    keyResolver: resolveAppKey,
  }),
);

router.post("/notifications/get/inbox", getNotifications);
router.post("/notifications/create", createNotifications);
router.post("/notifications/send", sendNotifications);
router.post("/notifications/read", readNotifications);
router.post("/users/contributions", getUsersContributions);
router.post("/users/contracts", getAdressesContracts);
router.post("/users/activity", getUsersActivity);

export default router;
