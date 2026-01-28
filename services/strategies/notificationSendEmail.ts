import { DbNotification, DbNotificationState } from "../../types/notifications";
import { NotificationSendStrategy } from "../../interfaces/strategies/notificationSend";
import { neonDb } from "../infrastructure/neon";
import axios from "axios";

export class NotificationSendEmailStrategy implements NotificationSendStrategy {
  public async send(
    notifications: DbNotification[],
    retryNotificationsStates: DbNotificationState[],
  ): Promise<{ [key: string]: DbNotificationState }> {
    const notificationsState: DbNotificationState[] = [];
    notifications.forEach((n) => {
      if (n.status == "error") {
        notificationsState.push({
          id: n.id,
          notification_id: n.id,
          status: "error",
          error: n.error || "Unknown error",
          send_date: new Date(),
          attemps: n.attemps ? n.attemps + 1 : 1,
          audience: n.audience,
        });
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
    notificationsState.push(...messageNotificationsState);

    const courseCompletionNotificationsState =
      await this.sendCourseCompletionNotifications(
        courseCompletionNotifications,
        retryNotificationsStates,
      );
    notificationsState.push(...courseCompletionNotificationsState);

    const newNotifications = notifications.filter(
      (n) =>
        n.status === "sending" ||
        n.status === "retry" ||
        (n.status === "retrying" &&
          !retryNotificationsStates.some((rn) => rn.notification_id === n.id)),
    );

    const notificationsToUpdate = notifications.filter(
      (n) =>
        n.status === "retrying" &&
        retryNotificationsStates.some((rn) => rn.notification_id === n.id),
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
      $4::date[],
      $5::integer[],
      $6::text[]
    )
    RETURNING id;
    `,
      [
        newNotifications.map((r) => r.id),
        newNotifications.map(
          (r) =>
            notificationsState.find(
              (ns) => ns.notification_id === r.id && ns.audience === r.audience,
            )?.status,
        ),
        newNotifications.map(
          (r) =>
            notificationsState.find(
              (ns) => ns.notification_id === r.id && ns.audience === r.audience,
            )?.error,
        ),
        newNotifications.map(() => new Date()),
        newNotifications.map(
          (r) =>
            notificationsState.find(
              (ns) => ns.notification_id === r.id && ns.audience === r.audience,
            )?.attemps,
        ),
        newNotifications.map((r) => r.audience),
      ],
    );
    notificationsToUpdate.forEach((n) => {
      const base_notification_id = n.id;
      n.id =
        retryNotificationsStates.find(
          (rn) =>
            rn.notification_id === base_notification_id &&
            rn.audience === n.audience,
        )?.id || 0;
      n.status =
        notificationsState.find(
          (ns) =>
            ns.notification_id === base_notification_id &&
            ns.audience === n.audience,
        )?.status ?? "error";
      n.error = notificationsState.find(
        (ns) =>
          ns.notification_id === base_notification_id &&
          ns.audience === n.audience,
      )?.error;
      n.attemps =
        notificationsState.find(
          (ns) =>
            ns.notification_id === base_notification_id &&
            ns.audience === n.audience,
        )?.attemps ?? 1;
    });

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
    UNNEST($4::date[]) AS send_date,
    UNNEST($5::int[])  AS attemps
) AS u
WHERE nes.id = u.id
RETURNING nes.notification_id;

    `,
      [
        notificationsToUpdate.map((r) => r.id),
        notificationsToUpdate.map((r) => r.status),
        notificationsToUpdate.map((r) => r.error),
        notificationsToUpdate.map(() => new Date()),
        notificationsToUpdate.map((r) => r.attemps),
      ],
    );
    const notificationsStateMap: { [key: string]: DbNotificationState } = {};
    notificationsState.forEach((ns) => {
      if (ns.status == "retry") {
        notificationsStateMap[ns.notification_id] = ns;
      } else if (ns.status == "error") {
        notificationsStateMap[ns.notification_id] = ns;
      }
    });
    return notificationsStateMap;
  }

  private async sendMessagesNotifications(
    notifications: DbNotification[],
    retryNotificationsStates: DbNotificationState[],
  ): Promise<DbNotificationState[]> {
    const notificationsStatus: DbNotificationState[] = [];
    if (process.env.HUBSPOT_WEBHOOK) {
      const response: { [key: string]: DbNotificationState } = await axios.post(
        process.env.HUBSPOT_WEBHOOK,
        {
          notifications: notifications,
        },
      );
      notifications.forEach((n) => {
        const currentAttemps = retryNotificationsStates.find(
          (rn) => rn.notification_id == n.id && rn.audience == n.audience,
        )?.attemps;
        const id = retryNotificationsStates.find(
          (rn) => rn.notification_id == n.id && rn.audience == n.audience,
        )?.id;
        notificationsStatus.push({
          id: id ?? 0,
          notification_id: n.id,
          status: response[n.id].status,
          error: response[n.id].error,
          send_date: new Date(),
          attemps: currentAttemps ? currentAttemps + 1 : 1,
          audience: n.audience,
        });
      });
    } else {
      notifications.forEach((n, i) => {
        const currentAttemps = retryNotificationsStates.find(
          (rn) => rn.notification_id == n.id && rn.audience == n.audience,
        )?.attemps;
        const id = retryNotificationsStates.find(
          (rn) => rn.notification_id == n.id && rn.audience == n.audience,
        )?.id;
        notificationsStatus.push({
          id: id ?? 0,
          notification_id: n.id,
          status: currentAttemps && currentAttemps >= 2 ? "error" : "retry",
          error: "Hubspot webhook not configured",
          send_date: new Date(),
          attemps: currentAttemps ? currentAttemps + 1 : 1,
          audience: n.audience,
        });
      });
    }
    return notificationsStatus;
  }

  private async sendCourseCompletionNotifications(
    notifications: DbNotification[],
    retryNotificationsStates: DbNotificationState[],
  ): Promise<DbNotificationState[]> {
    const notificationsStatus: DbNotificationState[] = [];
    if (process.env.HUBSPOT_WEBHOOK) {
      const response: { [key: string]: DbNotificationState } = await axios.post(
        process.env.HUBSPOT_WEBHOOK,
        {
          notifications: notifications,
        },
      );
      notifications.forEach((n) => {
        const currentAttemps = retryNotificationsStates.find(
          (rn) => rn.notification_id == n.id && rn.audience == n.audience,
        )?.attemps;
        const id = retryNotificationsStates.find(
          (rn) => rn.notification_id == n.id && rn.audience == n.audience,
        )?.id;
        notificationsStatus.push({
          id: id ?? 0,
          notification_id: n.id,
          status: response[n.id].status,
          error: response[n.id].error,
          send_date: new Date(),
          attemps: currentAttemps ? currentAttemps + 1 : 1,
          audience: n.audience,
        });
      });
    } else {
      notifications.forEach((n, i) => {
        const currentAttemps = retryNotificationsStates.find(
          (rn) => rn.notification_id == n.id && rn.audience == n.audience,
        )?.attemps;
        const id = retryNotificationsStates.find(
          (rn) => rn.notification_id == n.id && rn.audience == n.audience,
        )?.id;
        notificationsStatus.push({
          id: id ?? 0,
          notification_id: n.id,
          status: currentAttemps && currentAttemps >= 2 ? "error" : "retry",
          error: "Hubspot webhook not configured",
          send_date: new Date(),
          attemps: currentAttemps ? currentAttemps + 1 : 1,
          audience: n.audience,
        });
      });
    }
    return notificationsStatus;
  }
}
