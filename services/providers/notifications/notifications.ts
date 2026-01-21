import { neonDb } from "../../infrastructure/neon";
import { DbNotification, InputNotification } from "../../../types/notifications";

export class NotificationsProvider {

  constructor() { }

  public async fetchHackathons(hackathons: string[]) {
    console.log('HACKATHONSS: ', hackathons)
    const hackathonsDb = await neonDb.query<{id: string, admins: string}>(
      `SELECT * FROM "Hackathon" WHERE id LIKE ANY($1)`, [hackathons]
    );
    console.debug(`${hackathonsDb.length} fetched hackathons`);
    return hackathonsDb;
  }

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
      role: string
    }>(`SELECT * FROM "User" WHERE id = ANY($1) OR email = ANY($1)`, [
      users.map((u) => u),
    ]);
    console.debug(`${dbUsers.length} fetched users`);
    return dbUsers;
  }

  public async fetchAllUsers() {
    const dbUsers = await neonDb.query<{
      id: string;
      email: string;
    }>(`SELECT * FROM "User"`);
    console.debug(`${dbUsers.length} fetched users`);
    return dbUsers;
  }

  public async fetchUsersFromHackathons(notifications: InputNotification[]) {
    const data: { [key: string]: string[] } = {};
    const dbData = await neonDb.query<{ hackathon_id: string; users: string[] }>(`
      SELECT 
        h.id AS hackathon_id,
        ARRAY_AGG(DISTINCT m.user_id) AS users
      FROM "Hackathon" h
      JOIN "Project" p ON h.id = p.hackaton_id
      JOIN "Member" m ON m.project_id = p.id
      WHERE h.id = ANY($1) 
      GROUP BY h.id;
       `, [
      notifications.flatMap((n) => n.audience.hackathons! ?? []),
    ])
    dbData.forEach((row) => {
      if (!data[row.hackathon_id]) {
        data[row.hackathon_id] = row.users.filter((u) => u !== null);
      } else {
        data[row.hackathon_id] = [...data[row.hackathon_id], ...row.users.filter((u) => u !== null && !data[row.hackathon_id]?.includes(u))];
      }
    })

    console.debug(`${Object.keys(data).length} fetched hackathons`);
    return data;
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
