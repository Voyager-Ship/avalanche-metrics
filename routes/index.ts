import { Router } from "express";
import { getUsersContributions } from "../controllers/contributions/github";
import { getAdressesContracts } from "../controllers/contributions/chain";
import { getUsersActivity } from "../controllers/contributions/activity";
import { createNotifications } from "../controllers/notifications/create";
import { sendNotifications} from "../controllers/notifications/send";
import { getNotifications } from "../controllers/notifications/get";

const router = Router();

router.post("/notifications/get", getNotifications);
router.post("/notifications/create", createNotifications);
router.post("/notifications/send", sendNotifications);
router.post("/users/contributions", getUsersContributions);
router.post("/users/contracts", getAdressesContracts);
router.post("/users/activity", getUsersActivity);

export default router;
