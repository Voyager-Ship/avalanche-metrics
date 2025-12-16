import {neonDb} from "../../infrastructure/neon";
import { Notification } from "../../../types/notifications";

export class NotificationsProvider {
  constructor() {}
  public async fetchPendingNotifications() {
    const notifications = await neonDb.query<Notification>(
      `SELECT * FROM "Notification" WHERE pending = true`
    )
    return notifications
  }
}