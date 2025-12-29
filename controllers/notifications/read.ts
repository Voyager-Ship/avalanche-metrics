import { Request, Response } from "express";
import NotificationsReader from "../../services/notifications/read";

const notificationsReader = new NotificationsReader()

export const readNotifications = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({
      error:
        "The request body is required and must be an object containing user ids and an array of notifications for each user.",
    });
  }

  try {
    await notificationsReader.readNotifications(req.body);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: "failed to create notifications",
      details: String(err),
    });
  }
};
