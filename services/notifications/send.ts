import { NotificationsProvider } from "../providers/notifications/notifications";
import { DbNotification, InputNotification } from "../../types/notifications";
import { neonDb } from "../infrastructure/neon";

export default class NotificationsSender {
  private notificationsProvider = new NotificationsProvider();
  constructor() {}
  public async sendNotifications() {
    // Get data
    const notifications =
      await this.notificationsProvider.fetchPendingNotifications();
    const users = notifications.flatMap((n) => n.audience);
    const dbUsers = await this.notificationsProvider.fetchUsers(users);

    const emailNotificationsToSend: DbNotification[] = [];
    const inboxNotificationsToSend: DbNotification[] = [];
    notifications.forEach((n) => {
      const dbAudience = n.audience
        .split(",")
        .flatMap((u) => dbUsers.find((dbU) => dbU.id == u || dbU.email == u));
      dbAudience.forEach((u) => {
        if (u) {
          switch (u.notification_means) {
            case "email":
              emailNotificationsToSend.push({ ...n, audience: u.email });
            case "inbox":
              inboxNotificationsToSend.push({ ...n, audience: u.id });
            case "all":
              emailNotificationsToSend.push({ ...n, audience: u.email });
              inboxNotificationsToSend.push({ ...n, audience: u.id });
            default:
              n.status = "error";
          }
          n.status = "sent";
        } else {
          n.status = "error";
        }
      });
    });

    const emailNotificationsStatus = await this.sendEmailNotifications(
      emailNotificationsToSend
    );
    const inboxNotificationsStatus = await this.sendInboxNotifications(
      inboxNotificationsToSend
    );

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
          notifications.map((n) =>
            n.status == "sent" &&
            emailNotificationsStatus[n.id] == "sent" &&
            inboxNotificationsStatus[n.id] == "sent"
              ? "sent"
              : "error"
          ),
        ]
      );
    }
    return notifications;
  }

  private async sendEmailNotifications(notifications: DbNotification[]) {
    const notificationsStatus: { [key: string]: string } = {};
    const templates = notifications.map((n) => n.template ?? "");
    const dbTemplates = await this.notificationsProvider.fetchTemplates(
      templates
    );
    notifications.forEach((n) => {
      const template = dbTemplates.find((t) => t.id == n.template);
      n.status = "sent";
      if (n.status == "sent") {
        notificationsStatus[n.id] = "sent";
      }
    });
    return notificationsStatus;
  }
  private async sendInboxNotifications(notifications: DbNotification[]) {
    const notificationsStatus: { [key: string]: string } = {};
    notifications.forEach((n) => {
      n.status = "sent";
      if (n.status == "sent") {
        notificationsStatus[n.id] = "sent";
      }
    });
    return notificationsStatus;
  }
}
