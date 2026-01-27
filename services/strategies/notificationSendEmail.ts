import { DbNotification, DbNotificationState } from "../../types/notifications";
import { NotificationSendStrategy } from "../../interfaces/strategies/notificationSend";
import { neonDb } from "../infrastructure/neon";
import axios from "axios";

export class NotificationSendEmailStrategy implements NotificationSendStrategy {
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

    const res = await neonDb.query<{ id: number }>(
      `
    INSERT INTO "NotificationEmail" (
      notification_id,
      status,
      error,
      send_date,
      attemps
    )
    SELECT * FROM UNNEST (
      $1::integer[],
      $2::text[],
    )
    RETURNING id;
    `,
      [
        notifications.map((r) => r.id),
        notifications.map((r) => notificationsState[r.id].status),
        notifications.map((r) => notificationsState[r.id].error),
        notifications.map((r) => notificationsState[r.id].send_date),
        notifications.map((r) => notificationsState[r.id].attemps),
      ],
    );

    return notificationsState;
  }

  private async sendMessagesNotifications(
    notifications: DbNotification[],
  ): Promise<{ [key: string]: DbNotificationState }> {
    const notificationsStatus: { [key: string]: DbNotificationState } = {};
    if (process.env.HUBSPOT_WEBHOOK) {
      const response: { [key: string]: DbNotificationState } = await axios.post(
        process.env.HUBSPOT_WEBHOOK,
        {
          notifications: notifications,
        },
      );
      notifications.forEach((n) => {
        notificationsStatus[n.id] = {
          id: 0,
          notification_id: n.id,
          status: response[n.id].status,
          error: response[n.id].error,
          send_date: new Date(),
          attemps: n.attemps ? n.attemps + 1 : 1,
          audience: n.audience,
        };
      });
    } else {
      notifications.forEach((n) => {
        notificationsStatus[n.id] = {
          id: 0,
          notification_id: n.id,
          status: "error",
          error: "Hubspot webhook not configured",
          send_date: new Date(),
          attemps: n.attemps ? n.attemps + 1 : 1,
          audience: n.audience,
        };
      });
    }
    return notificationsStatus;
  }

  private async sendCourseCompletionNotifications(
    notifications: DbNotification[],
  ): Promise<{ [key: string]: DbNotificationState }> {
    const notificationsStatus: { [key: string]: DbNotificationState } = {};
    if (process.env.HUBSPOT_WEBHOOK) {
      const response: { [key: string]: DbNotificationState } = await axios.post(
        process.env.HUBSPOT_WEBHOOK,
        {
          notifications: notifications,
        },
      );
      notifications.forEach((n) => {
        notificationsStatus[n.id] = {
          id: 0,
          notification_id: n.id,
          status: response[n.id].status,
          error: response[n.id].error,
          send_date: new Date(),
          attemps: n.attemps ? n.attemps + 1 : 1,
          audience: n.audience,
        };
      });
    } else {
      notifications.forEach((n) => {
        notificationsStatus[n.id] = {
          id: 0,
          notification_id: n.id,
          status: "error",
          error: "Hubspot webhook not configured",
          send_date: new Date(),
          attemps: n.attemps ? n.attemps + 1 : 1,
          audience: n.audience,
        };
      });
    }
    return notificationsStatus;
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
