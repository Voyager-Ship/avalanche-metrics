import { neonDb } from "../infrastructure/neon";
import { DbNotification } from "../../types/notifications";

export default class NotificationsGetter {
  constructor() {}
  async getNotifications(users: string[]) {
    const data: { [key: string]: DbNotification[] } = {};
    console.debug("Getting notifications for users:", users);
    const notifications = await neonDb.query(
      `
  SELECT *
  FROM "Notification"
  WHERE string_to_array(audience, ',') && $1::text[]
  AND status = 'sent'
  `,
      [users]
    );

    users.forEach((user) => {
      data[user] = notifications.filter((n) =>
        n.audience.split(",").includes(user)
      );
    });
    return data;
  }
}
