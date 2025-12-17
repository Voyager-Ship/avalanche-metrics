import { NotificationsProvider } from "../providers/notifications/notifications";
import { Notification } from "../../types/notifications";
import { neonDb } from "../infrastructure/neon";

export default class NotificationsSender {
  private notificationsProvider = new NotificationsProvider();
  constructor() {}
  public async sendNotifications() {
    const notifications =
      await this.notificationsProvider.fetchPendingNotifications();
    const inboxNotifications = notifications.filter((n) =>
      n.type.includes("inbox")
    );
    const emailNotifications = notifications.filter((n) =>
      n.type.includes("email")
    );
    const sendedEmailNotifications =
      this.sendEmailNotifications(emailNotifications);
    const sendedInboxNotifications =
      this.sendInboxNotifications(inboxNotifications);
    const sendedNotifications = [
      ...sendedInboxNotifications,
      ...sendedEmailNotifications,
    ];

    if (sendedNotifications.length > 0) {
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
          sendedNotifications.map((n) => n.id),
          sendedNotifications.map((n) => n.status),
        ]
      );
    }
    return notifications;
  }

  private sendEmailNotifications(notifications: Notification[]) {
    const sendedNotifications: Notification[] = [];
    notifications.forEach((n) => {
      n.status = "sent";
      if (n.status == "sent") {
        sendedNotifications.push(n);
      }
    });
    return sendedNotifications;
  }
  private sendInboxNotifications(notifications: Notification[]) {
    const sendedNotifications: Notification[] = [];
    notifications.forEach((n) => {
      n.status = "sent";
      if (n.status == "sent") {
        sendedNotifications.push(n);
      }
    });
    return sendedNotifications;
  }
}
