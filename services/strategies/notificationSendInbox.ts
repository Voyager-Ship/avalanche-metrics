import { DbNotification, DbNotificationState } from "../../types/notifications";
import { NotificationSendStrategy } from "../../interfaces/strategies/notificationSend";
import { neonDb } from "../infrastructure/neon";

export class NotificationSendInboxStrategy implements NotificationSendStrategy {
  public async send(
    notifications: DbNotification[],
  ): Promise<{ [key: string]: DbNotificationState }> {
    const notificationsState: { [key: string]: DbNotificationState } = {};

    const messageNotifications = notifications.filter(
      (n) => n.type === "message",
    );
    const courseCompletionNotifications = notifications.filter(
      (n) => n.type === "course_completion",
    );

    const messageNotificationsState =
      await this.sendMessagesNotifications(messageNotifications);
    const courseCompletionNotificationsState =
      await this.sendCourseCompletionNotifications(
        courseCompletionNotifications,
      );

    notifications.forEach((n) => {
      switch (n.type) {
        case "message":
          notificationsState[n.id] = messageNotificationsState[n.id];
          break;
        case "course_completion":
          notificationsState[n.id] = courseCompletionNotificationsState[n.id];
          break;
        default:
          notificationsState[n.id] = this.buildUnknown(n);
          break;
      }
    });

    await neonDb.query<{ id: number }>(
      `
    INSERT INTO "NotificationInbox" (
      notification_id,
      status,
      error,
      send_date,
      attemps,
      audience
    )
    SELECT * FROM UNNEST (
      $1::integer[],
      $2::text[],
      $3::text[],
    )
    RETURNING id;
    `,
      [
        notifications.map((r) => r.id),
        notifications.map((r) => notificationsState[r.id].status),
        notifications.map((r) => notificationsState[r.id].error),
        notifications.map((r) => notificationsState[r.id].send_date),
        notifications.map((r) => notificationsState[r.id].attemps),
        notifications.map((r) => notificationsState[r.id].audience),
      ],
    );
    return notificationsState;
  }

  private async sendMessagesNotifications(
    notifications: DbNotification[],
  ): Promise<{ [key: string]: DbNotificationState }> {
    return {};
  }

  private async sendCourseCompletionNotifications(
    notifications: DbNotification[],
  ): Promise<{ [key: string]: DbNotificationState }> {
    return {};
  }

  private buildUnknown(notification: DbNotification): DbNotificationState {
    return {
      id: 0,
      notification_id: notification.id,
      status: "error",
      error: "Unknown notification type",
      send_date: new Date(),
      attemps: notification.attemps ? notification.attemps + 1 : 1,
      audience: notification.audience,
    };
  }
}
