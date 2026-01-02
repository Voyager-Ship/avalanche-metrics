import { NotificationsProvider } from "../providers/notifications/notifications";
import {
  DbNotification,
  InputNotification,
  NotificationInbox,
} from "../../types/notifications";
import { neonDb } from "../infrastructure/neon";

export default class NotificationsSender {
  private notificationsProvider = new NotificationsProvider();
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
          switch (u.notification_means) {
            case "email":
              emailNotificationsToSend.push({ ...n, audience: u.email });
              break;
            case "inbox":
              inboxNotificationsToSend.push({ ...n, audience: u.id });
              break;
            case "all":
              emailNotificationsToSend.push({ ...n, audience: u.email });
              inboxNotificationsToSend.push({ ...n, audience: u.id });
              break;
            default:
              n.status = "error";
              n.last_error = `Unknown notification means of user: ${u.id}`;
          }
          if (n.status == "pending") {
            n.status = "sent";
          }
        } else {
          n.status = "error";
          n.last_error = `User ${n.audience[i]} not found`;
        }
      });
    });

    const emailNotificationsStatus = await this.sendEmailNotifications(
      emailNotificationsToSend
    );
    const inboxNotificationsStatus = await this.sendInboxNotifications(
      inboxNotificationsToSend
    );

    notifications.forEach((n) => {
      n.status =
        n.status == "sent" &&
        (emailNotificationsStatus[n.id]?.status == "sent" ||
          inboxNotificationsStatus[n.id]?.status == "sent")
          ? "sent"
          : "error";
      n.last_error =
        emailNotificationsStatus[n.id]?.error ||
        inboxNotificationsStatus[n.id]?.error ||
        "";
    });

    if (notifications.length > 0) {
      await neonDb.query(
        `
        UPDATE "Notification" AS n
        SET status = u.status, last_error = u.last_error
        FROM (
          SELECT
            UNNEST($1::int[]) AS id,
            UNNEST($2::text[]) AS status,
            UNNEST($3::text[]) AS last_error
        ) AS u
        WHERE n.id = u.id;
        `,
        [
          notifications.map((n) => n.id),
          notifications.map((n) => n.status),
          notifications.map((n) => n.last_error || ""),
        ]
      );
    }
    return notifications;
  }

  private async sendEmailNotifications(notifications: DbNotification[]) {
    const notificationsStatus: {
      [key: string]: { status: string; error: string };
    } = {};
    const templates = notifications.map((n) => n.template ?? 0);
    const dbTemplates = await this.notificationsProvider.fetchTemplates(
      templates
    );
    notifications.forEach((n) => {
      const template = dbTemplates.find((t) => t.id == n.template);
      n.status = "sent";
      if (n.status == "sent") {
        notificationsStatus[n.id] = { status: "sent", error: "" };
      }
    });
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
      ]
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
