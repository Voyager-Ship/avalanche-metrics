import { neonDb } from "../../infrastructure/neon";
import { DbNotification } from "../../../types/notifications";

export class NotificationsProvider {
  constructor() {}
  public async fetchPendingNotifications() {
    const notifications = await neonDb.query<DbNotification>(
      `SELECT * FROM "Notification" WHERE status = 'pending'`
    );
    console.debug(`${notifications.length} fetched notifications`);
    return notifications;
  }
  public async fetchUsers(users: string[]) {
    const dbUsers = await neonDb.query<{
      id: string;
      email: string;
      notification_means: string;
    }>(`SELECT * FROM "User" WHERE id = ANY($1) OR email = ANY($1)`, [
      users.map((u) => u),
    ]);
    console.debug(`${dbUsers.length} fetched users`);
    return dbUsers;
  }
  public async fetchTemplates(templates: number[]) {
    const dbTemplates = await neonDb.query<{ id: number; template: string }>(
      `SELECT * FROM "NotificationTemplate" WHERE id = ANY($1)`,
      [templates.map((u) => u)]
    );
    console.debug(`${dbTemplates.length} fetched templates`);
    return dbTemplates;
  }
}
