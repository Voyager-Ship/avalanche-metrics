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
  FROM "NotificationInbox"
  WHERE audience = ANY($1::text[])
  ORDER BY
    CASE status
      WHEN 'sent' THEN 0
      WHEN 'read' THEN 1
      ELSE 2
    END
  LIMIT 20
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
