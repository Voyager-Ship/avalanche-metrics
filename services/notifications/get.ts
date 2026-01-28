import { neonDb } from "../infrastructure/neon";
import { DbNotification } from "../../types/notifications";

export default class NotificationsGetter {
  constructor() {}
  async getNotifications(users: string[]) {
    const data: { [key: string]: DbNotification[] } = {};
    console.debug("Getting notifications for users:", users);
    const notifications = await neonDb.query(
      `
  SELECT n.*, nis.status AS status, nis.audience AS audience
  FROM "NotificationInboxState" AS nis
  JOIN "Notification" AS n
  ON nis.notification_id = n.id
  WHERE nis.audience = ANY($1::text[]) AND nis.status IN ('sent', 'read')
  ORDER BY
    CASE nis.status
      WHEN 'sent' THEN 0
      WHEN 'read' THEN 1
      ELSE 2
    END
  LIMIT 20
  `,
      [users],
    );

    users.forEach((user) => {
      data[user] = notifications.filter((n) =>
        n.audience.split(",").includes(user),
      );
    });
    return data;
  }
}
