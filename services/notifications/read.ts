import { neonDb } from "../infrastructure/neon";

export default class NotificationsReader {
  public async readNotifications(userId: string, notification: number[]): Promise<void> {
    if (notification.length === 0) return;

    console.debug(`Marking ${notification.length} notifications as read for user ${userId}`);

    await neonDb.query(
      `
      UPDATE "NotificationInboxState" AS n
      SET status = 'read'
      WHERE n.notification_id = ANY($1::int[])
        AND n.audience = $2;
      `,
      [notification, userId]
    );
  }
}
