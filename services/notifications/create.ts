import { Notification } from "../../types/notifications";
import { neonDb } from "../infrastructure/neon";

export default class NotificationsCreator {
  constructor() {}
  public async createNotifications(notifications: Notification[]) {
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
      recipients
    )
    SELECT * FROM UNNEST (
      $1::text[], 
      $2::text[], 
      $3::text[], 
      $4::text[], 
      $5::text[],
      $6::text[],
      $7::text[],
      $8::text[]
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
        notifications.map(() => 'pending'),
        notifications.map((r) => r.recipients),
      ]
    );
  }
}
