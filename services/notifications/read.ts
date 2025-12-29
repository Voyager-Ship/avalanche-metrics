import { neonDb } from "../infrastructure/neon";

export default class NotificationsReader {
  constructor() {}
  public async readNotifications(data: { [key: number]: string[] }) {
    console.log(`Marking ${Object.keys(data).length} notifications as read`);
    await neonDb.query(
      `
      UPDATE "Notification" AS n
        SET notified_audience =
          CASE
            WHEN n.notified_audience IS NULL OR n.notified_audience = ''
              THEN sub.audience
            ELSE n.notified_audience || ',' || sub.audience
          END
      FROM (
        SELECT
          UNNEST($1::int[])  AS id,
          UNNEST($2::text[]) AS audience
      ) AS sub
      WHERE n.id = sub.id;
    `,
      [
        Object.keys(data).map((k) => parseInt(k)),
        Object.values(data).map((v) => v.join(",")),
      ]
    );
  }
}
