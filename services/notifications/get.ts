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
  WHERE
    status = 'sent'
    AND string_to_array(audience, ',')::text[] && $1::text[]
    AND NOT (string_to_array(COALESCE(notified_audience, ''), ',')::text[] && $1::text[])
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
