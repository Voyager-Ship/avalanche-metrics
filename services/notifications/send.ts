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

    const users = notifications.flatMap((n) => n.audience.split(","));
    const dbUsers = await this.notificationsProvider.fetchUsers(users);

    const emailNotificationsToSend: DbNotification[] = [];
    const inboxNotificationsToSend: DbNotification[] = [];

    notifications.forEach((n) => {
      const dbAudience = n.audience
        .split(",")
        .flatMap((u) => dbUsers.find((dbU) => dbU.id == u || dbU.email == u));
      dbAudience.forEach((u, i) => {
        if (u) {
          let added = false;
          if (
            u.notification_means &&
            u.notification_means[n.type] &&
            u.notification_means[n.type][0]
          ) {
            inboxNotificationsToSend.push({
              ...n,
              audience: u.id,
              status: n.status == "pending" ? "sending" : "retrying",
            });
            added = true;
          }
          if (
            u.notification_means &&
            u.notification_means[n.type] &&
            u.notification_means[n.type][1]
          ) {
            emailNotificationsToSend.push({
              ...n,
              audience: u.email,
              status: n.status == "pending" ? "sending" : "retrying",
            });
            added = true;
          }
          if (added) {
            n.status = n.status === "pending" ? "sending" : "retrying";
          } else {
            inboxNotificationsToSend.push({
              ...n,
              audience: u.id,
              status: "error",
              error: "No notification means enabled",
            });
          }
        } else {
          inboxNotificationsToSend.push({
            ...n,
            audience: n.audience.split(",")[i],
            status: "error",
            error: "User not found",
          });
          n.status = "retry";
        }
      });
    });
    console.log("Notifications: ", notifications);
    console.log("Inbox notifications to send: ", inboxNotificationsToSend);
    console.log("Email notifications to send: ", emailNotificationsToSend);

    const emailNotificationsStatus = await this.emailSender.send(
      emailNotificationsToSend,
      emailRetryNotificationsStates,
    );
    console.log("Email notifications status: ", emailNotificationsStatus);

    // const inboxNotificationsStatus = await this.sendInboxNotifications(
    //   inboxNotificationsToSend,
    // );

    notifications.forEach((n) => {
      if (emailNotificationsStatus[n.id]?.status == "retry") {
        n.status = "retry";
      }
      if (emailNotificationsStatus[n.id]?.status == "error") {
        n.status = "error";
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
        [
          notifications.map((n) => n.id),
          notifications.map((n) => n.status),
        ],
      );
    }
    return notifications;
  }

  private async sendInboxNotifications(notifications: DbNotification[]) {
    const notificationsStatus: {
      [key: string]: { status: string; error: string };
    } = {};
    const response = await this.inboxSender.send(notifications);
    return notificationsStatus;
  }
}
