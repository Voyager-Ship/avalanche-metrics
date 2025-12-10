import { Router } from "express";
import { getUsersContributions } from "../controllers/contributions/github";
import { getAdressesContracts } from "../controllers/contributions/chain";
import { getUsersActivity } from "../controllers/contributions/activity";
import { sendNotifications } from "../controllers/notifications/send";

const router = Router();

router.post("/notifications/send", sendNotifications);
router.post("/users/contributions", getUsersContributions);
router.post("/users/contracts", getAdressesContracts);
router.post("/users/activity", getUsersActivity);

export default router;
