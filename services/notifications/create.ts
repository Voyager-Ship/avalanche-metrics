import { InputNotification } from "../../types/notifications";
import { NotificationsProvider } from "../providers/notifications/notifications";
import { neonDb } from "../infrastructure/neon";

export default class NotificationsCreator {
  private notificationProvider = new NotificationsProvider();
  constructor() {}
  public async createNotifications(
    authUser: string,
    notifications: InputNotification[],
  ) {
    let allUsers: string[] = [];
    let hackathonsData: { [key: string]: string[] } = {};

    const hackathonsDB = await this.notificationProvider.fetchHackathons(
      notifications.flatMap((n) => n.audience.hackathons ?? []),
    );

    const authUserDB = await this.notificationProvider.fetchUsers([authUser]);

    // There are notifications
    if (notifications.length === 0) {
      return;
    }

    // Modify notifications based on user roles
    const notificationsToSend: InputNotification[] = [];
    notifications.forEach((n) => {
      const notificationToSend = {
        ...n,
        audience: {
          all: authUserDB[0].custom_attributes.includes("devrel")
            ? n.audience.all
            : false,
          users: authUserDB[0].custom_attributes.includes("devrel")
            ? n.audience.users
            : n.audience.users.includes(authUserDB[0].id) ||
                n.audience.users.includes(authUserDB[0].email)
              ? [authUserDB[0].id]
              : [],
          hackathons: authUserDB[0].custom_attributes.includes("devrel")
            ? n.audience.hackathons
            : authUserDB[0].custom_attributes.includes("notify_event")
              ? n.audience.hackathons?.filter((h) =>
                  hackathonsDB.some(
                    (hDB) =>
                      hDB.id == h &&
                      (hDB.admins.includes(authUserDB[0].id) ||
                        hDB.admins.includes(authUserDB[0].email)),
                  ),
                )
              : [],
        },
      };
      if (
        notificationToSend.audience.all ||
        (notificationToSend.audience.users &&
          notificationToSend.audience.users.length > 0) ||
        (notificationToSend.audience.hackathons &&
          notificationToSend.audience.hackathons.length > 0)
      ) {
        notificationsToSend.push(notificationToSend);
      }
    });

    if (notificationsToSend.some((n) => n.audience.all)) {
      allUsers = (await this.notificationProvider.fetchAllUsers()).map(
        (u) => u.id,
      );
    } else if (
      notificationsToSend.some((n) => n.audience.hackathons?.length ?? 0 > 0)
    ) {
      hackathonsData =
        await this.notificationProvider.fetchUsersFromHackathons(
          notificationsToSend,
        );
    }
    console.log('Notifications to send: ', notificationsToSend);

    await neonDb.query(
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
    audience,
    creator,
    created_at
  )
  SELECT
    u.type,
    u.title,
    u.content,
    u.content_type,
    u.short_description,
    u.template,
    u.status,
    u.last_error,
    u.audience,
    u.creator,
    NOW()
  FROM UNNEST(
    $1::text[],
    $2::text[],
    $3::text[],
    $4::text[],
    $5::text[],
    $6::text[],
    $7::text[],
    $8::text[],
    $9::text[],
    $10::text[]
  ) AS u(
    type,
    title,
    content,
    content_type,
    short_description,
    template,
    status,
    last_error,
    audience,
    creator
  )
  RETURNING id;
  `,
      [
        notificationsToSend.map((r) => r.type),
        notificationsToSend.map((r) => r.title),
        notificationsToSend.map((r) => r.content),
        notificationsToSend.map((r) => r.content_type),
        notificationsToSend.map((r) => r.short_description),
        notificationsToSend.map((r) => r.template),
        notificationsToSend.map(() => "pending"),
        notificationsToSend.map(() => ""),
        notificationsToSend.map((r) =>
          this.getNotificationAudience(r, allUsers, hackathonsData),
        ),
        notificationsToSend.map(() => authUserDB[0].id),
      ],
    );
  }
  private getNotificationAudience(
    notification: InputNotification,
    allUsers: string[],
    hackathonsData: { [key: string]: string[] },
  ): string {
    let audience: string = "";
    if (notification.audience.all) {
      return allUsers.join(",");
    }
    if (
      notification.audience.hackathons &&
      notification.audience.hackathons.length > 0
    ) {
      const users = notification.audience.hackathons.flatMap(
        (h) => hackathonsData[h] || [],
      );
      audience = users.join(",");
    }
    if (notification.audience.users && notification.audience.users.length > 0) {
      audience = audience
        ? audience + "," + notification.audience.users.join(",")
        : notification.audience.users.join(",");
    }
    return audience;
  }
}
