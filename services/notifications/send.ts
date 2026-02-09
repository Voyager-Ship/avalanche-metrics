import { NotificationsProvider } from "../providers/notifications/notifications";
import { DbNotification, DbNotificationState } from "../../types/notifications";
import { NotificationSendEmailStrategy } from "../strategies/notificationSendEmail";
import { NotificationSendInboxStrategy } from "../strategies/notificationSendInbox";
import { neonDb } from "../infrastructure/neon";

export default class NotificationsSender {
  private notificationsProvider = new NotificationsProvider();

  private emailSender = new NotificationSendEmailStrategy();
  private inboxSender = new NotificationSendInboxStrategy();

  constructor() {}
  public async sendNotifications() {
    const notifications =
      await this.notificationsProvider.fetchUnsentNotifications();

    const { inboxRetryNotificationsStates, emailRetryNotificationsStates } =
      await this.notificationsProvider.fetchRetryNotificationsStates();

    const { inboxSentNotificationsStates, emailSentNotificationsStates } =
      await this.notificationsProvider.fetchSentNotificationsStates(
        notifications,
      );
    const { inboxErrorNotificationsStates, emailErrorNotificationsStates } =
      await this.notificationsProvider.fetchErrorNotificationsStates(
        notifications,
      );

    const users = notifications.flatMap((n) => n.audience.split(","));
    const dbUsers = await this.notificationsProvider.fetchUsers(users);

    const emailNotificationsToSend: DbNotification[] = [];
    const inboxNotificationsToSend: DbNotification[] = [];

    notifications.forEach((n) => {
      const dbAudience = n.audience
        .split(",")
        .flatMap((user) => dbUsers.find((dbUser) => dbUser.id == user || dbUser.email == user));
      dbAudience.forEach((u, i) => {
        if (u) {
          let added = false;
          if (
            u.notification_means &&
            u.notification_means[n.type] &&
            u.notification_means[n.type][0]
          ) {
            if (
              inboxSentNotificationsStates.some(
                (isns) =>
                  (isns.notification_id === n.id && isns.audience === u.id) ||
                  isns.audience === u.email,
              ) ||
              inboxErrorNotificationsStates.some(
                (isns) =>
                  (isns.notification_id === n.id && isns.audience === u.id) ||
                  isns.audience === u.email,
              )
            ) {
              added = true;
            } else {
              inboxNotificationsToSend.push({
                ...n,
                audience: u.id,
                status: n.status == "pending" ? "sending" : "retrying",
              });
              added = true;
            }
          }
          if (
            u.notification_means &&
            u.notification_means[n.type] &&
            u.notification_means[n.type][1]
          ) {
            if (
              emailSentNotificationsStates.some(
                (isns) =>
                  (isns.notification_id === n.id && isns.audience === u.id) ||
                  isns.audience === u.email,
              ) ||
              emailErrorNotificationsStates.some(
                (isns) =>
                  (isns.notification_id === n.id && isns.audience === u.id) ||
                  isns.audience === u.email,
              )
            ) {
              added = true;
            } else {
              emailNotificationsToSend.push({
                ...n,
                audience: u.email,
                status: n.status == "pending" ? "sending" : "retrying",
              });
              added = true;
            }
          }
          if (added) {
            n.status = n.status === "pending" ? "sending" : "retrying";
          } else {
            inboxNotificationsToSend.push({
              ...n,
              audience: u.id,
              status: "retry",
              error: "No notification means enabled",
            });
            n.status = "retry";
          }
        } else {
          inboxNotificationsToSend.push({
            ...n,
            audience: n.audience.split(",")[i],
            status: "retry",
            error: "User not found",
          });
          n.status = "retry";
        }
      });
    });

    const emailNotificationsStatus = await this.emailSender.send(
      emailNotificationsToSend,
      emailRetryNotificationsStates,
    );

    const inboxNotificationsStatus = await this.inboxSender.send(
      inboxNotificationsToSend,
      inboxRetryNotificationsStates,
    );

    notifications.forEach((n) => {
      n.status = "error";
      if (
        inboxNotificationsStatus[n.id]?.status == "sent" &&
        emailNotificationsStatus[n.id]?.status == "sent"
      ) {
        n.status = "sent";
      }
      if (inboxNotificationsStatus[n.id]?.status == "retry") {
        n.status = "retry";
      }
      if (emailNotificationsStatus[n.id]?.status == "retry") {
        n.status = "retry";
      }
      if (emailNotificationsStatus[n.id]?.status == "error") {
        n.status = n.status == "retry" ? "retry" : "error";
      }
      if (emailNotificationsStatus[n.id]?.status == "error") {
        n.status = n.status == "retry" ? "retry" : "error";
      }
    });

    if (notifications.length > 0) {
      await neonDb.query(
        `
        UPDATE "Notification" AS n
        SET status = u.status
        FROM (
          SELECT
            UNNEST($1::int[]) AS id,
            UNNEST($2::text[]) AS status
        ) AS u
        WHERE n.id = u.id;
        `,
        [notifications.map((n) => n.id), notifications.map((n) => n.status)],
      );
    }
    return notifications;
  }
}
