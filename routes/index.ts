import { Router } from "express";
import { getUsersContributions } from "../controllers/contributions/github";
import { getAdressesContracts } from "../controllers/contributions/chain";
import { getUsersActivity } from "../controllers/contributions/activity";
import { createNotifications } from "../controllers/notifications/create";
import { sendNotifications } from "../controllers/notifications/send";
import { getNotifications } from "../controllers/notifications/get";
import { readNotifications } from "../controllers/notifications/read";
import { jwtAuth } from "../middlewares/jwtAuth";

const router = Router();

router.post("/notifications/get/inbox", jwtAuth, getNotifications);
router.post("/notifications/create", jwtAuth, createNotifications);
router.post("/notifications/send", sendNotifications);
router.post("/notifications/read", jwtAuth, readNotifications);
router.post("/users/contributions", getUsersContributions);
router.post("/users/contracts", getAdressesContracts);
router.post("/users/activity", getUsersActivity);

export default router;
