import { InputNotification } from "../../types/notifications";
import { NotificationsProvider } from "../providers/notifications/notifications";
import { neonDb } from "../infrastructure/neon";

export default class NotificationsCreator {
  private notificationProvider = new NotificationsProvider();
  constructor() { }
  public async createNotifications(notifications: InputNotification[]) {
    let allUsers: string[] = [];
    let hackathonsData: { [key: string]: string[] } = {};

    if (notifications.length === 0) { return }

    if (notifications.some((n) => n.audience.all)) {
      allUsers = (await this.notificationProvider.fetchAllUsers()).map((u) => u.id);
    } else if (notifications.some((n) => n.audience.hackathons?.length ?? 0 > 0)) {
      hackathonsData = await this.notificationProvider.fetchUsersFromHackathons(notifications)
    }

      neonDb.query(
        `
      INSERT INTO "Notification" (
        type, 
        title,
        content,
        content_type,
        short_description,
        template,
        status,
        last_error,
        audience
      )
      SELECT * FROM UNNEST (
        $1::text[], 
        $2::text[], 
        $3::text[], 
        $4::text[], 
        $5::text[],
        $6::text[],
        $7::text[],
        $8::text[],
        $9::text[]
      )
      RETURNING id;
      `,
        [
          notifications.map((r) => r.type),
          notifications.map((r) => r.title),
          notifications.map((r) => r.content),
          notifications.map((r) => r.content_type),
          notifications.map((r) => r.short_description),
          notifications.map((r) => r.template),
          notifications.map(() => "pending"),
          notifications.map(() => ""),
          notifications.map((r) => this.getNotificationAudience(r, allUsers, hackathonsData)),
        ]
      );
  }
  private getNotificationAudience(notification: InputNotification, allUsers: string[], hackathonsData: { [key: string]: string[] }): string {
    let audience: string = '';
    if (notification.audience.all) {
      return allUsers.join(',');
    }
    if (notification.audience.hackathons && notification.audience.hackathons.length > 0) {
      const users = notification.audience.hackathons.flatMap((h) => hackathonsData[h] || []);
      audience = users.join(',');
    }
    if (notification.audience.users && notification.audience.users.length > 0) {
      audience = audience ? audience + ',' + notification.audience.users.join(',') : notification.audience.users.join(',');
    }
    return audience
  }
}
