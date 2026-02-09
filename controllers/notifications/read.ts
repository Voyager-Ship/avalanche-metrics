import { Request, Response } from "express";
import NotificationsReader from "../../services/notifications/read";

const notificationsReader = new NotificationsReader();
type AuthedRequest = Request & { user?: { id: string } };

export const readNotifications = async (req: Request, res: Response) => {
  const { notifications, authUser } = req.body as unknown as any;
  if (
    !notifications ||
    !Array.isArray(notifications) ||
    notifications.length === 0
  ) {
    return res.status(400).json({
      error: "notifications field is required and must be an array",
    });
  }
  if (!authUser) {
    return res.status(400).json({
      error: "authUser field is required and must be an string",
    });
  }

  const userId: string | undefined = (req as AuthedRequest).user?.id;

  try {
    await notificationsReader.readNotifications(userId ?? "", req.body);
    return res.json({ success: true });
  } catch (err) {
    console.error("Error at read notifications: ", err);
    return res.status(500).json({
      error: "Failed to create notifications",
    });
  }
};
