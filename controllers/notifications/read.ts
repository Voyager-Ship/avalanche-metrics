import { Request, Response } from "express";
import NotificationsReader from "../../services/notifications/read";

const notificationsReader = new NotificationsReader()
type AuthedRequest = Request & { user?: { id: string } };

export const readNotifications = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({
      error:
        "The request body is required and must be an array of notifications.",
    });
  }

  const userId: string | undefined = (req as AuthedRequest).user?.id;

  try {
    await notificationsReader.readNotifications(userId ?? '', req.body);
    return res.json({ success: true });
  } catch (err) {
    console.error('Error at read notifications: ', err)
    return res.status(500).json({
      error: "Failed to create notifications"
    });
  }
};
