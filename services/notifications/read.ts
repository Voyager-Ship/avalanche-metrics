import { neonDb } from "../infrastructure/neon";

export default class NotificationsReader {
  constructor() {}
  public async readNotifications(data: number[]) {
    console.debug(`Marking ${data.length} notifications as read`);
    await neonDb.query(
      `
      UPDATE "NotificationInbox" AS n
      SET status = 'read'
      FROM (
        SELECT
          UNNEST($1::int[])  AS id
      ) AS sub
      WHERE n.id = sub.id;
    `,
      [data.map((k) => k)]
    );
  }
}
