import { NotificationsProvider } from "../providers/notifications/notifications";
import { DbNotification, NotificationInbox } from "../../types/notifications";
import { neonDb } from "../infrastructure/neon";
import { NotificationSendEmailStrategy } from "../strategies/notificationSendEmail";
import { NotificationSendInboxStrategy } from "../strategies/notificationSendInbox";

export default class NotificationsSender {
  private notificationsProvider = new NotificationsProvider();

  private emailSender = new NotificationSendEmailStrategy();
  private inboxSender = new NotificationSendInboxStrategy();

  constructor() {}
  public async sendNotifications() {
    const notifications =
      await this.notificationsProvider.fetchPendingNotifications();
    console.debug("Fetched notifications:", notifications);
    const users = notifications.flatMap((n) => n.audience.split(","));
    console.debug("Extracted users from notifications:", users);
    const dbUsers = await this.notificationsProvider.fetchUsers(users);
    console.debug("Fetched users from DB:", dbUsers);

    const emailNotificationsToSend: DbNotification[] = [];
    const inboxNotificationsToSend: DbNotification[] = [];
    notifications.forEach((n) => {
      const dbAudience = n.audience
        .split(",")
        .flatMap((u) => dbUsers.find((dbU) => dbU.id == u || dbU.email == u));
      dbAudience.forEach((u, i) => {
        if (u) {
          if (
            u.notification_means &&
            u.notification_means[n.type] &&
            u.notification_means[n.type][0]
          ) {
            inboxNotificationsToSend.push({ ...n, audience: u.id });
          }
          if (
            u.notification_means &&
            u.notification_means[n.type] &&
            u.notification_means[n.type][1]
          ) {
            emailNotificationsToSend.push({ ...n, audience: u.email });
          }
          if (n.status == "pending") {
            n.status = "sending";
          }
        } else {
          inboxNotificationsToSend.push({
            ...n,
            audience: n.audience.split(",")[i],
            status: "userNotFound",
          });
          n.status = "userNotFound";
        }
      });
    });

    const emailNotificationsStatus = await this.sendEmailNotifications(
      emailNotificationsToSend,
    );
    const inboxNotificationsStatus = await this.sendInboxNotifications(
      inboxNotificationsToSend,
    );

    notifications.forEach((n) => {
      n.status =
        n.status == "sent" &&
        !(
          emailNotificationsStatus[n.id]?.status == "error" ||
          inboxNotificationsStatus[n.id]?.status == "error"
        )
          ? "sent"
          : "error";
    });

    if (notifications.length > 0) {
      await neonDb.query(
        `
        UPDATE "Notification" AS n
        SET status = u.status 
        FROM (
          SELECT
            UNNEST($1::int[]) AS id,
            UNNEST($2::text[]) AS status,
            UNNEST($3::text[]) AS last_error
        ) AS u
        WHERE n.id = u.id;
        `,
        [notifications.map((n) => n.id), notifications.map((n) => n.status)],
      );
    }
    return notifications;
  }

  private async sendEmailNotifications(notifications: DbNotification[]) {
    const notificationsStatus: {
      [key: string]: { status: string; error: string };
    } = {};
    const response = await this.emailSender.send(notifications);
    return notificationsStatus;
  }
  private async sendInboxNotifications(notifications: DbNotification[]) {
    console.debug(`Sending ${notifications.length} inbox notifications:`);
    const notificationsStatus: {
      [key: string]: { status: string; error: string };
    } = {};

    const notificationsToSend: NotificationInbox[] = notifications.map((n) => ({
      id: 0,
      audience: n.audience,
      type: n.type,
      title: n.title,
      content: n.content,
      short_description: n.short_description,
      status: "sent",
    }));
    const res = await neonDb.query<{ id: number }>(
      `
    INSERT INTO "NotificationInbox" (
      type,
      title,
      content,
      short_description,
      status,
      audience
    )
    SELECT * FROM UNNEST (
      $1::text[],
      $2::text[],
      $3::text[],
      $4::text[],
      $5::text[],
      $6::text[]
    )
    RETURNING id;
    `,
      [
        notificationsToSend.map((r) => r.type),
        notificationsToSend.map((r) => r.title),
        notificationsToSend.map((r) => r.content),
        notificationsToSend.map((r) => r.short_description),
        notificationsToSend.map((r) => r.status),
        notificationsToSend.map((r) => r.audience),
      ],
    );

    notifications.forEach((n, i) => {
      n.status = "sent";
      notificationsStatus[n.id] = {
        status: res[i] ? "sent" : "error",
        error: res[i] ? "" : "Failed to insert inbox notification",
      };
    });
    return notificationsStatus;
  }
}
