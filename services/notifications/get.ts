import { neonDb } from "../infrastructure/neon";
import { DbNotification } from "../../types/notifications";

export default class NotificationsGetter {
  constructor() {}
  async getNotifications(users: string[]) {
    const data: { [key: string]: DbNotification[] } = {};
    console.debug("Getting notifications for users:", users);
    const notifications = await neonDb.query(
      `
  SELECT TOP 20 *
  FROM "NotificationInbox"
  WHERE AND audience = ANY($1::text[])
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
