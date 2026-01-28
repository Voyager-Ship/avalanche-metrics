import { DbNotification, DbNotificationState } from "../../types/notifications";
import { NotificationSendStrategy } from "../../interfaces/strategies/notificationSend";
import { neonDb } from "../infrastructure/neon";
import axios from "axios";

export class NotificationSendEmailStrategy implements NotificationSendStrategy {
  public async send(
    notifications: DbNotification[],
    retryNotificationsStates: DbNotificationState[],
  ): Promise<{ [key: string]: DbNotificationState }> {
    const notificationsState: { [key: string]: DbNotificationState } = {};
    console.log("CURRENT NOTIFICATIONS: ", notifications);
    console.log("RETRY NOTIFICATIONS STATES: ", retryNotificationsStates);
    notifications.forEach((n) => {
      if (n.status == "error") {
        notificationsState[n.id] = {
          id: n.id,
          notification_id: n.id,
          status: "error",
          error: n.error || "Unknown error",
          send_date: new Date(),
          attemps: n.attemps ? n.attemps + 1 : 1,
          audience: n.audience,
        };
      }
    });
    const notificationsToSend = notifications.filter(
      (n) => n.status === "sending" || n.status === "retrying",
    );

    const messageNotifications = notificationsToSend.filter(
      (n) => n.type === "message",
    );
    const courseCompletionNotifications = notificationsToSend.filter(
      (n) => n.type === "course_completion",
    );

    const messageNotificationsState = await this.sendMessagesNotifications(
      messageNotifications,
      retryNotificationsStates,
    );

    const courseCompletionNotificationsState =
      await this.sendCourseCompletionNotifications(
        courseCompletionNotifications,
        retryNotificationsStates,
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

    const newNotifications = notifications.filter(
      (n) =>
        n.status === "sending" ||
        n.status === "retry" ||
        (n.status === "retrying" &&
          !retryNotificationsStates.some((rn) => rn.notification_id === n.id)),
    );

    const notificationsToUpdate = notifications.filter(
      (n) =>
        n.status === "retrying" ||
        (n.status === "error" &&
          retryNotificationsStates.some((rn) => rn.notification_id === n.id)),
    );

    await neonDb.query<{ id: number }>(
      `
    INSERT INTO "NotificationEmailState" (
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
      $4::text[],
      $5::integer[],
      $6::text[]
    )
    RETURNING id;
    `,
      [
        newNotifications.map((r) => r.id),
        newNotifications.map((r) => notificationsState[r.id].status),
        newNotifications.map((r) => notificationsState[r.id].error),
        newNotifications.map((r) => notificationsState[r.id].send_date),
        newNotifications.map((r) => notificationsState[r.id].attemps),
        newNotifications.map((r) => r.audience),
      ],
    );

    console.log("NOTIFICATIONS TO UPDATE: ", notificationsToUpdate);
    console.log("Notificat: ", notificationsToUpdate);

    await neonDb.query<{ id: number }>(
      `
      UPDATE "NotificationEmailState" AS nes
SET 
  status    = u.status,
  error     = u.error,
  send_date = u.send_date,
  attemps   = u.attemps
FROM (
  SELECT 
    UNNEST($1::int[])  AS id,
    UNNEST($2::text[]) AS status,
    UNNEST($3::text[]) AS error,
    UNNEST($4::text[]) AS send_date,
    UNNEST($5::int[])  AS attemps
) AS u
WHERE nes.notification_id = u.id
RETURNING nes.notification_id;

    `,
      [
        notificationsToUpdate.map((r) => r.id),
        notificationsToUpdate.map((r) => notificationsState[r.id].status),
        notificationsToUpdate.map((r) => notificationsState[r.id].error),
        notificationsToUpdate.map((r) => notificationsState[r.id].send_date),
        notificationsToUpdate.map((r) => notificationsState[r.id].attemps),
      ],
    );

    return notificationsState;
  }

  private async sendMessagesNotifications(
    notifications: DbNotification[],
    retryNotificationsStates: DbNotificationState[],
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
        const currentAttemps = retryNotificationsStates.find(
          (rn) => rn.notification_id === n.id,
        )?.attemps;
        notificationsStatus[n.id] = {
          id: 0,
          notification_id: n.id,
          status: response[n.id].status,
          error: response[n.id].error,
          send_date: new Date(),
          attemps: currentAttemps ? currentAttemps + 1 : 1,
          audience: n.audience,
        };
      });
    } else {
      notifications.forEach((n) => {
        const currentAttemps = retryNotificationsStates.find(
          (rn) => rn.notification_id === n.id,
        )?.attemps;
        notificationsStatus[n.id] = {
          id: 0,
          notification_id: n.id,
          status: currentAttemps && currentAttemps >= 2 ? "error" : "retry",
          error: "Hubspot webhook not configured",
          send_date: new Date(),
          attemps: currentAttemps ? currentAttemps + 1 : 1,
          audience: n.audience,
        };
      });
    }
    return notificationsStatus;
  }

  private async sendCourseCompletionNotifications(
    notifications: DbNotification[],
    retryNotificationsStates: DbNotificationState[],
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
          status:
            response[n.id].status == "error"
              ? n.attemps >= 2
                ? "error"
                : "retry"
              : response[n.id].status,
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
          status: n.attemps >= 2 ? "error" : "retry",
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
      status: notification.attemps >= 2 ? "error" : "retry",
      error: "Unknown notification type",
      send_date: new Date(),
      attemps: notification.attemps ? notification.attemps + 1 : 1,
      audience: notification.audience,
    };
  }
}
